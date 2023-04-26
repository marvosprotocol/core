import { hexlify, randomBytes } from 'ethers/lib/utils'
import { BigNumber } from 'ethers'

export function generateRandomId() {
  return BigNumber.from(hexlify(randomBytes(32)))
}
