export function getUtf8ByteLength(value: string | null | undefined) {
  return Buffer.byteLength(value ?? '', 'utf8');
}
