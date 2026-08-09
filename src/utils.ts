const getVersion = (data: ArrayBuffer | Uint8Array): number => {
  const dataHeader =
    data instanceof Uint8Array ? data.slice(0, 4) : new Uint8Array(data, 0, 4)
  if (
    dataHeader[0] === 80 &&
    dataHeader[1] === 75 &&
    dataHeader[2] === 3 &&
    dataHeader[3] === 4
  ) {
    return 1
  }
  return 2
}

export const Utils = {
  getVersion
}
