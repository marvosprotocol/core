import { Signer, utils as ethersUtils } from 'ethers'
import { Marvos, MarvosInterface } from '../../../build/types'
import { generateRandomId } from './common'
import { structs } from './structs'

const { arrayify, parseEther } = ethersUtils

type OfferStruct = MarvosInterface.OfferStruct
type BidStruct = MarvosInterface.BidStruct
type ItemStruct = MarvosInterface.ItemStruct

export async function generateBidWithToken(
  marvos: Marvos,
  creator: Signer,
  escrow: Signer,
  offer: OfferStruct,
  tokenAddress: string,
  bidOverrides?: Partial<BidStruct>,
  itemOverrides?: Partial<ItemStruct>,
) {
  return await generateBid(
    marvos,
    escrow,
    {
      id: generateRandomId(),
      offerId: offer.id,
      status: 1,
      creator: creator.getAddress(),
      token: tokenAddress,
      tokenAmount: parseEther('1'),
      offerTokenAmount: offer.maxAmount,
      processingTime: 300,
      ...(bidOverrides || {}),
    },
    itemOverrides || {},
  )
}

export async function generateBidWithoutToken(
  marvos: Marvos,
  creator: Signer,
  escrow: Signer,
  offer: OfferStruct,
  bidOverrides?: Partial<BidStruct>,
  itemOverrides?: Partial<ItemStruct>,
) {
  return await generateBid(
    marvos,
    escrow,
    {
      id: generateRandomId(),
      offerId: offer.id,
      status: 1,
      creator: creator.getAddress(),
      offerTokenAmount: offer.maxAmount,
      processingTime: 300,
      ...(bidOverrides || {}),
    },
    {
      hasExternalItem: true,
      ...(itemOverrides || {}),
    },
  )
}

async function generateBid(
  marvos: Marvos,
  escrow: Signer,
  bidOverrides: Partial<BidStruct>,
  itemOverrides: Partial<ItemStruct>,
) {
  const bid: BidStruct = {
    ...structs.bid,
    ...bidOverrides,
    item: {
      ...structs.bid.item,
      itemData: '0x1234',
      disputeHandler: escrow.getAddress(),
      disputeHandlerFeeReceiver: escrow.getAddress(),
      ...itemOverrides,
    },
  }

  bid.item.disputeHandlerProof = escrow.signMessage(
    arrayify(await marvos.generateHashForBid(bid)),
  )

  return Object.freeze(bid)
}
