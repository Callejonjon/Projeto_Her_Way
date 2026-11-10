/**
 * Read ZIP archives directly in browsers supporting the native Compression Streams API.
 * No third-party CDN or access to user's files outside their explicit selection.
 * Uses the ZIP central directory, which also supports entries written with data descriptors.
 */
export async function unpackCourseZip(archive: File): Promise<File[]> {
  const buf = await archive.arrayBuffer();
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  const read16 = (o: number) => view.getUint16(o, true);
  const read32 = (o: number) => view.getUint32(o, true);
  const signature = (o: number) => view.getUint32(o, true);
  const decoder = new TextDecoder("utf-8");
  let eocd = -1;
  for (let p = buf.byteLength - 22; p >= Math.max(0, buf.byteLength - 65557); p--) {
    if (signature(p) === 0x06054b50) { eocd = p; break; }
  }
  if (eocd < 0) throw new Error("Arquivo ZIP inválido. Selecione o pacote original da Her Way.");
  const count = read16(eocd + 10);
  const centralStart = read32(eocd + 16);
  if (count > 150 || buf.byteLength > 80 * 1024 * 1024) {
    throw new Error("O pacote excede o limite de 150 arquivos ou 80 MB.");
  }
  const files: File[] = [];
  let cursor = centralStart;
  let totalSize = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > buf.byteLength || signature(cursor) !== 0x02014b50) {
      throw new Error("O índice do arquivo ZIP está corrompido.");
    }
    const flags = read16(cursor + 8);
    const method = read16(cursor + 10);
    const compressedLength = read32(cursor + 20);
    const expandedLength = read32(cursor + 24);
    const nameLength = read16(cursor + 28);
    const extraLength = read16(cursor + 30);
    const commentLength = read16(cursor + 32);
    const localOffset = read32(cursor + 42);
    const filename = decoder.decode(bytes.subarray(cursor + 46, cursor + 46 + nameLength));
    cursor += 46 + nameLength + extraLength + commentLength;
    if (filename.endsWith("/") || !/\.(pdf|pptx)$/i.test(filename)) continue;
    if (flags & 1) throw new Error("ZIP protegido por senha não é suportado.");
    if (![0, 8].includes(method)) throw new Error("Método de compactação não suportado para " + filename);
    totalSize += expandedLength;
    if (totalSize > 100 * 1024 * 1024 || expandedLength > 50 * 1024 * 1024) {
      throw new Error("O pacote contém arquivos maiores que o limite de segurança.");
    }
    if (localOffset + 30 > buf.byteLength || signature(localOffset) !== 0x04034b50) {
      throw new Error("Um arquivo dentro do ZIP está corrompido: " + filename);
    }
    const localNameLength = read16(localOffset + 26);
    const localExtraLength = read16(localOffset + 28);
    const start = localOffset + 30 + localNameLength + localExtraLength;
    if (start + compressedLength > buf.byteLength) throw new Error("Arquivo incompleto: " + filename);
    const zippedBytes = bytes.slice(start, start + compressedLength);
    let output: Uint8Array;
    if (method === 0) output = zippedBytes;
    else {
      if (typeof DecompressionStream === "undefined") {
        throw new Error("Seu navegador não permite abrir ZIP. Tente usar o Chrome atualizado.");
      }
      try {
        const stream = new Blob([zippedBytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
        output = new Uint8Array(await new Response(stream).arrayBuffer());
      } catch {
        throw new Error("Não foi possível extrair o ZIP neste navegador. Tente abrir pelo Chrome atualizado.");
      }
    }
    if (output.byteLength !== expandedLength) throw new Error("O arquivo está incompleto: " + filename);
    const simpleName = filename.split("/").at(-1) ?? filename;
    files.push(new File([output], simpleName, {
      type: simpleName.toLowerCase().endsWith(".pptx")
        ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "application/pdf",
    }));
  }
  if (!files.length) throw new Error("Nenhum PDF ou PowerPoint foi encontrado neste ZIP.");
  return files;
}
