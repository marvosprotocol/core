/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/restrict-plus-operands */
import { expect } from 'chai'
import { BigNumber, constants } from 'ethers'
import { arrayify } from 'ethers/lib/utils'
import '../../hardhat.config'
import {
  generateBidWithoutToken,
  generateOfferWithoutToken,
  generateOfferWithToken,
  loadBaseTestFixture,
  loadTestWithTokenFixture,
  StandardError,
} from '../utils'

describe('Marvos', () => {
  describe('Offer Management', () => {
    describe('createOffer', () => {
      describe('validations', () => {
        it('should revert if offer id is not set', async () => {
          const { marvos, alice, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
            id: 0,
          })
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.IdTaken)
        })

        it('should revert if offer id has already been used', async () => {
          const { marvos, alice, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
            id: 1,
          })

          await marvos.connect(alice).createOffer(offer, true)
          await expect(marvos.connect(alice).createOffer(offer, true))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.IdTaken)
        })

        it('should revert if offer creation call is coming from an address other than offer.creator', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
            creator: bob.address,
          })

          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.Unauthorized)
        })

        it('should revert if offer includes a blacklisted token', async () => {
          const { marvos, alice, admin, escrow, sampleToken } =
            await loadTestWithTokenFixture()
          const offer = await generateOfferWithToken(
            marvos,
            alice,
            escrow,
            sampleToken.address,
          )

          await marvos.connect(admin).setTokenBlacklisted(sampleToken.address, true)
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.TokenBlacklisted)
        })

        it('should revert if offer status is not active', async () => {
          const { marvos, alice, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
            status: 0,
          })

          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OfferStatusInvalid)
        })

        it('should revert if processing time is greater than hard limit', async () => {
          const { marvos, alice, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
            orderProcessingTime: (await marvos.MAXIMUM_ORDER_PROCESSING_TIME()) + 1,
          })
          await expect(marvos.connect(alice).createOffer(offer, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OrderProcessingTimeInvalid)
        })

        describe('amount validations', () => {
          describe('when token is not set', () => {
            it('should revert if total amount is not zero', async () => {
              const { marvos, alice, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
                totalAmount: 10,
              })
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if there is no associated external item', async () => {
              const { marvos, alice, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(
                marvos,
                alice,
                escrow,
                {},
                {
                  hasExternalItem: false,
                },
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.TokenOrItemRequired)
            })

            it('should revert if available amount is not total amount', async () => {
              const { marvos, alice, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
                availableAmount: 5,
                totalAmount: 6,
              })
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if max amount is not zero', async () => {
              const { marvos, alice, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
                maxAmount: 10,
              })
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if min amount is not zero', async () => {
              const { marvos, alice, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow, {
                minAmount: 10,
              })
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })
          })

          describe('when token is set', () => {
            it('should revert if total amount is zero', async () => {
              const { marvos, alice, escrow, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                sampleToken.address,
                {
                  totalAmount: 0,
                },
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if min amount is zero', async () => {
              const { marvos, alice, escrow, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                sampleToken.address,
                {
                  minAmount: 0,
                },
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if available amount is not total amount', async () => {
              const { marvos, alice, escrow, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                sampleToken.address,
                {
                  availableAmount: 5,
                  totalAmount: 6,
                },
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if max amount less than min amount', async () => {
              const { marvos, alice, escrow, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                sampleToken.address,
                {
                  maxAmount: 4,
                  minAmount: 5,
                },
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if max amount is greater than total amount', async () => {
              const { marvos, alice, escrow, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                sampleToken.address,
                {
                  totalAmount: 10,
                  maxAmount: 15,
                },
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if token is eth and exact value is not transferred', async () => {
              const { marvos, alice, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                await marvos.COIN_ADDRESS(),
              )
              await expect(marvos.connect(alice).createOffer(offer, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.CoinDepositRejected)
            })

            it('should revert if token is not a contract', async () => {
              const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                bob.address,
              )
              await expect(
                marvos.connect(alice).createOffer(offer, false),
              ).to.be.revertedWith('Address: call to non-contract')
            })

            it('should revert if token is erc20 but token not approved', async () => {
              const { marvos, alice, escrow, sampleToken } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                sampleToken.address,
              )
              await expect(
                marvos.connect(alice).createOffer(offer, false),
              ).to.be.revertedWith('ERC20: insufficient allowance')
            })
          })
        })

        describe('item validations', () => {
          it('should revert if item data is not set', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(
              marvos,
              alice,
              escrow,
              {},
              {
                itemData: '0x',
              },
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.ItemDataInvalid)
          })

          it('should revert if dispute handler address is not set', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(
              marvos,
              alice,
              escrow,
              {},
              {
                disputeHandler: constants.AddressZero,
              },
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.DisputeHandlerRequired)
          })

          it('should revert if dispute handler fee receiver address is not set', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(
              marvos,
              alice,
              escrow,
              {},
              {
                disputeHandlerFeeReceiver: constants.AddressZero,
              },
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.DisputeHandlerFeeReceiverRequired)
          })

          it('should revert if dispute handler fee is too high', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(
              marvos,
              alice,
              escrow,
              {},
              {
                disputeHandlerFeePercentage:
                  (await marvos.maxDisputeHandlerFeePercentage()) + 1,
              },
            )
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.FeeTooHigh)
          })

          it('should revert if a fake signature is appended to offer', async () => {
            const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
            const validOffer = await generateOfferWithoutToken(marvos, alice, escrow)
            const invalidOffer = {
              ...validOffer,
              item: {
                ...validOffer.item,
                disputeHandlerProof: bob.signMessage(
                  arrayify(await marvos.generateHashForOffer(validOffer)),
                ),
              },
            }
            await expect(marvos.connect(alice).createOffer(invalidOffer, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.SignatureInvalid)
          })
        })
      })

      describe('effects', () => {
        describe('when the offer does not include a token', () => {
          it('should create an offer without a token', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            await expect(marvos.connect(alice).createOffer(offer, false))
              .to.emit(marvos, 'OfferCreated')
              .withArgs(offer.id, offer.token, alice.address)
          })
        })

        describe('when the offer includes a token', () => {
          it('should create an offer with the token and transfer token to the contract', async () => {
            const { marvos, admin, alice, escrow, sampleToken } =
              await loadTestWithTokenFixture()

            const offer = await generateOfferWithToken(
              marvos,
              alice,
              escrow,
              sampleToken.address,
            )
            await sampleToken.connect(admin).transfer(alice.address, offer.totalAmount)
            await sampleToken.connect(alice).approve(marvos.address, offer.totalAmount)
            await expect(marvos.connect(alice).createOffer(offer, false))
              .changeTokenBalances(
                sampleToken.address,
                [marvos.address, alice.address],
                [offer.totalAmount, 0],
              )
              .to.emit(marvos, 'OfferCreated')
              .withArgs(offer.id, offer.token, alice.address)
          })

          it('should use balance when the account has balance and useBalance is true', async () => {
            const { marvos, admin, alice, escrow, sampleToken } =
              await loadTestWithTokenFixture()

            const offer = await generateOfferWithToken(
              marvos,
              alice,
              escrow,
              sampleToken.address,
            )
            await sampleToken.connect(admin).transfer(alice.address, offer.totalAmount)
            await sampleToken.connect(alice).approve(marvos.address, offer.totalAmount)
            await marvos.connect(alice).createOffer(offer, false)

            // cancel and get everything back in balance
            await marvos.connect(alice).updateOfferStatus(offer.id, 3)

            // no more allowance
            expect(await sampleToken.allowance(alice.address, marvos.address)).to.eq(0)

            const newOffer = await generateOfferWithToken(
              marvos,
              alice,
              escrow,
              sampleToken.address,
              {
                totalAmount: offer.totalAmount,
                availableAmount: offer.availableAmount,
                maxAmount: offer.maxAmount,
                minAmount: offer.minAmount,
              },
            )
            // but since the user has balance - we can use it
            await expect(marvos.connect(alice).createOffer(newOffer, true))
              .to.emit(marvos, 'OfferCreated')
              .withArgs(newOffer.id, newOffer.token, alice.address)
          })

          it('should create an offer if the correct amount of ETH is transferred to the contract', async () => {
            const { marvos, alice, escrow } = await loadTestWithTokenFixture()

            const offer = await generateOfferWithToken(
              marvos,
              alice,
              escrow,
              await marvos.COIN_ADDRESS(),
            )

            await expect(
              marvos.connect(alice).createOffer(offer, false, {
                value: offer.totalAmount,
              }),
            )
              .changeEtherBalances(
                [marvos.address, alice.address],
                [offer.totalAmount, 0],
              )
              .to.emit(marvos, 'OfferCreated')
              .withArgs(offer.id, offer.token, alice.address)
          })
        })
      })
    })

    describe('updateOfferStatus', () => {
      describe('validations', () => {
        it('should revert when the new status is Unset', async () => {
          const { marvos, alice, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          await marvos.connect(alice).createOffer(offer, true)

          await expect(marvos.connect(alice).updateOfferStatus(offer.id, 0))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OfferStatusInvalid)
        })

        it('should revert if the caller is different from the offer creator', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          await marvos.connect(alice).createOffer(offer, true)

          await expect(marvos.connect(bob).updateOfferStatus(offer.id, 2))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.Unauthorized)
        })

        it('should revert if the offer has already been canceled', async () => {
          const { marvos, alice, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          await marvos.connect(alice).createOffer(offer, true)
          await marvos.connect(alice).updateOfferStatus(offer.id, 3)
          await expect(marvos.connect(alice).updateOfferStatus(offer.id, 2))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OfferInactive)
        })
      })

      describe('pause', () => {
        describe('effects', () => {
          it('should update the offer status and set it to paused', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            await marvos.connect(alice).createOffer(offer, true)

            const status = 2
            await expect(marvos.connect(alice).updateOfferStatus(offer.id, status))
              .to.emit(marvos, 'OfferStatusChanged')
              .withArgs(offer.id, status)
            const offerOnChain = await marvos.offers(offer.id)
            expect(offerOnChain.status).to.eq(status)
          })
        })
      })

      describe('cancel', () => {
        describe('when the offer has no token', () => {
          it('should update the offer status and set it to canceled', async () => {
            const { marvos, alice, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            await marvos.connect(alice).createOffer(offer, true)

            const status = 3
            await expect(marvos.connect(alice).updateOfferStatus(offer.id, status))
              .to.emit(marvos, 'OfferStatusChanged')
              .withArgs(offer.id, status)
            const offerOnChain = await marvos.offers(offer.id)
            expect(offerOnChain.status).to.eq(status)
          })
        })

        describe('when the offer has a token', () => {
          it('should refund the total amount to the user if the no order has been created on the offer', async () => {
            const { marvos, admin, alice, escrow, sampleToken } =
              await loadTestWithTokenFixture()
            const offer = await generateOfferWithToken(
              marvos,
              alice,
              escrow,
              sampleToken.address,
            )

            await sampleToken.connect(admin).transfer(alice.address, offer.totalAmount)
            await sampleToken.connect(alice).approve(marvos.address, offer.totalAmount)
            await marvos.connect(alice).createOffer(offer, true)

            const status = 3
            await expect(marvos.connect(alice).updateOfferStatus(offer.id, status))
              .to.emit(marvos, 'OfferStatusChanged')
              .withArgs(offer.id, status)
              .to.emit(marvos, 'BalanceCredited')
              .withArgs(
                alice.address,
                sampleToken.address,
                2,
                offer.totalAmount,
                offer.totalAmount,
              )

            const offerOnChain = await marvos.offers(offer.id)
            expect(offerOnChain.status).to.eq(status)

            const balanceOnChain = await marvos.tokenBalances(
              alice.address,
              sampleToken.address,
            )
            expect(balanceOnChain).to.eq(offer.totalAmount)
          })

          it('should refund only the available amount amount to the user if the an order has been created on the offer', async () => {
            const { marvos, admin, alice, bob, escrow, sampleToken } =
              await loadTestWithTokenFixture()
            const offer = await generateOfferWithToken(
              marvos,
              alice,
              escrow,
              sampleToken.address,
              {
                totalAmount: 10,
                availableAmount: 10,
                maxAmount: 10,
                minAmount: 5,
              },
            )
            const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
              offerTokenAmount: 6,
            })

            const expectedAvailableAmount = BigNumber.from(offer.totalAmount).sub(
              BigNumber.from(bid.offerTokenAmount),
            )

            await sampleToken.connect(admin).transfer(alice.address, offer.totalAmount)
            await sampleToken.connect(alice).approve(marvos.address, offer.totalAmount)
            await marvos.connect(alice).createOffer(offer, true)
            await marvos.connect(bob).placeBid(bid, true)
            await marvos.connect(alice).acceptBid(bid.id) // order is created on acceptance

            const status = 3
            await expect(marvos.connect(alice).updateOfferStatus(offer.id, status))
              .to.emit(marvos, 'OfferStatusChanged')
              .withArgs(offer.id, status)
              .to.emit(marvos, 'BalanceCredited')
              .withArgs(
                alice.address,
                sampleToken.address,
                2,
                expectedAvailableAmount,
                expectedAvailableAmount,
              )

            const offerOnChain = await marvos.offers(offer.id)
            expect(offerOnChain.status).to.eq(status)

            const balanceOnChain = await marvos.tokenBalances(
              alice.address,
              sampleToken.address,
            )
            expect(balanceOnChain).to.eq(expectedAvailableAmount)
          })
        })
      })
    })
  })
})
