/** BodyInit typing: narrow PDF bytes to a plain ArrayBuffer for NextResponse. */
export function pdfBytesAsResponseBody(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}
