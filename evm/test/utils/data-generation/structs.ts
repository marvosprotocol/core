﻿import { constants } from 'ethers'
import { MarvosInterface } from '../../../build/types'

const structs: {
  offer: Readonly<MarvosInterface.OfferStruct>
  bid: Readonly<MarvosInterface.BidStruct>
} = {
  offer: Object.freeze({
    id: 0,
    maxAmount: 0,
    minAmount: 0,
    availableAmount: 0,
    totalAmount: 0,
    token: constants.AddressZero,
    orderProcessingTime: 0,
    creator: constants.AddressZero,
    status: 0,
    item: {
      chargeNonDispute: false,
      hasExternalItem: false,
      itemData: '0x',
      disputeHandler: constants.AddressZero,
      disputeHandlerFeeReceiver: constants.AddressZero,
      disputeHandlerFeePercentage: 0,
      disputeHandlerProof: '0x',
    },
  }),
  bid: Object.freeze({
    id: 0,
    token: constants.AddressZero,
    creator: constants.AddressZero,
    status: 0,
    offerId: 0,
    offerTokenAmount: 0,
    processingTime: 0,
    tokenAmount: 0,
    item: {
      chargeNonDispute: false,
      hasExternalItem: false,
      itemData: '0x',
      disputeHandler: constants.AddressZero,
      disputeHandlerFeeReceiver: constants.AddressZero,
      disputeHandlerFeePercentage: 0,
      disputeHandlerProof: '0x',
    },
  }),
}

export { structs }
