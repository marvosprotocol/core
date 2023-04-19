﻿import { ITroca, ITrocaInterface } from '../../build/types'
import { Signer } from 'ethers'
import { arrayify } from 'ethers/lib/utils'

type OfferStruct = ITrocaInterface.OfferStruct

export async function regenerateOffer(
  itroca: ITroca,
  signer: Signer,
  offer: Readonly<OfferStruct>,
  overrides: Partial<OfferStruct>,
) {
  return await regenerate(offer, overrides, async (newOffer) => ({
    ...newOffer,
    item: {
      ...newOffer.item,
      disputeHandlerProof: await signer.signMessage(
        arrayify(await itroca.generateHashForOffer(newOffer)),
      ),
    },
  }))
}

async function regenerate<T>(
  data: Readonly<T>,
  override: Partial<T>,
  recompute: (a: T) => Promise<T>,
): Promise<Readonly<T>> {
  const newData = {
    ...data,
    ...override,
  }
  return Object.freeze(await recompute(newData))
}
