import { Signer, utils as ethersUtils } from 'ethers'
import { Marvos, MarvosInterface } from '../../../build/types'
import { generateRandomId } from './common'
import { structs } from './structs'

const { arrayify, parseEther } = ethersUtils

type OfferStruct = MarvosInterface.OfferStruct
type ItemStruct = MarvosInterface.ItemStruct

export async function generateOfferWithToken(
  marvos: Marvos,
  creator: Signer,
  escrow: Signer,
  tokenAddress: string,
  offerOverrides?: Partial<OfferStruct>,
  itemOverrides?: Partial<ItemStruct>,
) {
  return await generateOffer(
    marvos,
    escrow,
    {
      id: generateRandomId(),
      status: 1,
      creator: creator.getAddress(),
      token: tokenAddress,
      totalAmount: parseEther('1'),
      availableAmount: parseEther('1'),
      maxAmount: parseEther('1'),
      minAmount: parseEther('0.1'),
      orderProcessingTime: 300,
      ...(offerOverrides || {}),
    },
    itemOverrides || {},
  )
}

export async function generateOfferWithoutToken(
  marvos: Marvos,
  creator: Signer,
  escrow: Signer,
  offerOverrides?: Partial<OfferStruct>,
  itemOverrides?: Partial<ItemStruct>,
) {
  return await generateOffer(
    marvos,
    escrow,
    {
      id: generateRandomId(),
      status: 1,
      creator: creator.getAddress(),
      orderProcessingTime: 300,
      ...(offerOverrides || {}),
    },
    {
      hasExternalItem: true,
      ...(itemOverrides || {}),
    },
  )
}

async function generateOffer(
  marvos: Marvos,
  escrow: Signer,
  offerOverrides: Partial<OfferStruct>,
  itemOverrides: Partial<ItemStruct>,
) {
  const offer: OfferStruct = {
    ...structs.offer,
    ...offerOverrides,
    item: {
      ...structs.offer.item,
      itemData: '0x1234',
      disputeHandler: escrow.getAddress(),
      disputeHandlerFeeReceiver: escrow.getAddress(),
      ...itemOverrides,
    },
  }

  offer.item.disputeHandlerProof = escrow.signMessage(
    arrayify(await marvos.generateHashForOffer(offer)),
  )

  return Object.freeze(offer)
}
