/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-argument,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/restrict-plus-operands */
import { expect } from 'chai'
import { BigNumber, constants } from 'ethers'
import { arrayify } from 'ethers/lib/utils'
import '../../hardhat.config'
import {
  generateBidWithoutToken,
  generateBidWithToken,
  generateOfferWithoutToken,
  generateOfferWithToken,
  loadBaseTestFixture,
  loadTestWithTokenFixture,
  StandardError,
} from '../utils'

describe('Marvos', () => {
  describe('Bidding', () => {
    describe('placeBid', () => {
      describe('validations', () => {
        it('should revert if bid id is not set', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
            id: 0,
          })

          await marvos.connect(alice).createOffer(offer, false)
          await expect(marvos.connect(bob).placeBid(bid, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.IdTaken)
        })

        it('should revert if bid id has already been used', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
            id: 1,
          })

          await marvos.connect(alice).createOffer(offer, false)
          await marvos.connect(bob).placeBid(bid, false)
          await expect(marvos.connect(bob).placeBid(bid, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.IdTaken)
        })

        it('should revert if placeBid call is coming from an address other than bid.creator', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
            creator: alice.address,
          })

          await marvos.connect(alice).createOffer(offer, false)
          await expect(marvos.connect(bob).placeBid(bid, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.Unauthorized)
        })

        it('should revert if bid includes a blacklisted token', async () => {
          const { marvos, alice, bob, admin, escrow, tokenA } =
            await loadTestWithTokenFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithToken(
            marvos,
            bob,
            escrow,
            offer,
            tokenA.address,
          )

          await marvos.connect(admin).setTokenBlacklisted(tokenA.address, true)
          await marvos.connect(alice).createOffer(offer, false)
          await expect(marvos.connect(bob).placeBid(bid, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.TokenBlacklisted)
        })

        it('should revert if bid status is not active', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
            status: 0,
          })

          await marvos.connect(alice).createOffer(offer, false)
          await expect(marvos.connect(bob).placeBid(bid, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.BidStatusInvalid)
        })

        it('should revert if processing time is greater than hard limit', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
            processingTime: (await marvos.MAXIMUM_ORDER_PROCESSING_TIME()) + 1,
          })

          await marvos.connect(alice).createOffer(offer, false)
          await expect(marvos.connect(bob).placeBid(bid, false))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.OrderProcessingTimeInvalid)
        })

        describe('amount validations', () => {
          describe('when token is not set', () => {
            it('should revert if total amount is not zero', async () => {
              const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow)
              const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
                tokenAmount: 10,
              })
              await marvos.connect(alice).createOffer(offer, false)
              await expect(marvos.connect(bob).placeBid(bid, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if there is no associated external item', async () => {
              const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow)
              const bid = await generateBidWithoutToken(
                marvos,
                bob,
                escrow,
                offer,
                {},
                {
                  hasExternalItem: false,
                },
              )
              await marvos.connect(alice).createOffer(offer, false)
              await expect(marvos.connect(bob).placeBid(bid, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.TokenOrItemRequired)
            })

            it('should revert if bid.offerTokenAmount is greater than offer max amount', async () => {
              const { marvos, admin, alice, bob, escrow, tokenA } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                tokenA.address,
              )
              const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
                offerTokenAmount: BigNumber.from(offer.maxAmount).add(1),
              })

              await tokenA.connect(admin).transfer(alice.address, offer.totalAmount)
              await tokenA.connect(alice).approve(marvos.address, offer.totalAmount)
              await marvos.connect(alice).createOffer(offer, false)

              await expect(marvos.connect(bob).placeBid(bid, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if bid.offerTokenAmount amount is less than offer min amount', async () => {
              const { marvos, admin, alice, bob, escrow, tokenA } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithToken(
                marvos,
                alice,
                escrow,
                tokenA.address,
              )
              const bid = await generateBidWithoutToken(marvos, bob, escrow, offer, {
                offerTokenAmount: BigNumber.from(offer.minAmount).sub(1),
              })

              await tokenA.connect(admin).transfer(alice.address, offer.totalAmount)
              await tokenA.connect(alice).approve(marvos.address, offer.totalAmount)
              await marvos.connect(alice).createOffer(offer, false)

              await expect(marvos.connect(bob).placeBid(bid, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })
          })

          describe('when token is set', () => {
            it('should revert if total amount is zero', async () => {
              const { marvos, alice, bob, escrow, tokenA } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow)
              const bid = await generateBidWithToken(
                marvos,
                bob,
                escrow,
                offer,
                tokenA.address,
                {
                  tokenAmount: 0,
                },
              )
              await marvos.connect(alice).createOffer(offer, false)
              await expect(marvos.connect(bob).placeBid(bid, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.AmountInvalid)
            })

            it('should revert if token is eth and exact value is not transferred', async () => {
              const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow)
              const bid = await generateBidWithToken(
                marvos,
                bob,
                escrow,
                offer,
                await marvos.COIN_ADDRESS(),
              )
              await marvos.connect(alice).createOffer(offer, false)
              await expect(marvos.connect(bob).placeBid(bid, false))
                .to.be.revertedWith('StandardError')
                .withArgs(StandardError.CoinDepositRejected)
            })

            it('should revert if token is not a contract', async () => {
              const { marvos, alice, bob, mark, escrow } = await loadBaseTestFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow)
              const bid = await generateBidWithToken(
                marvos,
                bob,
                escrow,
                offer,
                mark.address,
              )
              await marvos.connect(alice).createOffer(offer, false)
              await expect(marvos.connect(bob).placeBid(bid, false)).to.be.revertedWith(
                'Address: call to non-contract',
              )
            })

            it('should revert if token is erc20 but token not approved', async () => {
              const { marvos, alice, bob, escrow, tokenA } =
                await loadTestWithTokenFixture()
              const offer = await generateOfferWithoutToken(marvos, alice, escrow)
              const bid = await generateBidWithToken(
                marvos,
                bob,
                escrow,
                offer,
                tokenA.address,
              )
              await marvos.connect(alice).createOffer(offer, false)
              await expect(marvos.connect(bob).placeBid(bid, false)).to.be.revertedWith(
                'ERC20: insufficient allowance',
              )
            })
          })
        })

        describe('item validations', () => {
          it('should revert if item data is not set', async () => {
            const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithoutToken(
              marvos,
              bob,
              escrow,
              offer,
              {},
              {
                itemData: '0x',
              },
            )
            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(bid, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.ItemDataInvalid)
          })

          it('should revert if dispute handler address is not the same as the offer dispute handler', async () => {
            const { marvos, alice, bob, mark, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithoutToken(
              marvos,
              bob,
              escrow,
              offer,
              {},
              {
                disputeHandler: mark.address,
              },
            )
            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(bid, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.DisputeHandlerMismatch)
          })

          it('should revert if dispute handler fee receiver address is not set', async () => {
            const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithoutToken(
              marvos,
              bob,
              escrow,
              offer,
              {},
              {
                disputeHandlerFeeReceiver: constants.AddressZero,
              },
            )
            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(bid, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.DisputeHandlerFeeReceiverRequired)
          })

          it('should revert if dispute handler fee is too high', async () => {
            const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithoutToken(
              marvos,
              bob,
              escrow,
              offer,
              {},
              {
                disputeHandlerFeePercentage:
                  (await marvos.maxDisputeHandlerFeePercentage()) + 1,
              },
            )
            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(bid, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.FeeTooHigh)
          })

          it('should revert if a fake signature is appended to offer', async () => {
            const { marvos, alice, bob, mark, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const validBid = await generateBidWithoutToken(marvos, bob, escrow, offer)
            const invalidBid = {
              ...validBid,
              item: {
                ...validBid.item,
                disputeHandlerProof: mark.signMessage(
                  arrayify(await marvos.generateHashForBid(validBid)),
                ),
              },
            }

            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(invalidBid, false))
              .to.be.revertedWith('StandardError')
              .withArgs(StandardError.SignatureInvalid)
          })
        })
      })

      describe('effects', () => {
        describe('when the bid does not include a token', () => {
          it('should place a bid without a token', async () => {
            const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithoutToken(marvos, bob, escrow, offer)
            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(bid, false))
              .to.emit(marvos, 'BidPlaced')
              .withArgs(bid.id, offer.id, bob.address)
          })
        })

        describe('when the bid includes a token', () => {
          it('should place a bid with the token and transfer token to the contract', async () => {
            const { marvos, admin, alice, bob, escrow, tokenA } =
              await loadTestWithTokenFixture()

            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithToken(
              marvos,
              bob,
              escrow,
              offer,
              tokenA.address,
            )

            await tokenA.connect(admin).transfer(bob.address, bid.tokenAmount)
            await tokenA.connect(bob).approve(marvos.address, bid.tokenAmount)

            await marvos.connect(alice).createOffer(offer, false)
            await expect(marvos.connect(bob).placeBid(bid, false))
              .changeTokenBalances(
                tokenA.address,
                [marvos.address, bob.address],
                [bid.tokenAmount, 0],
              )
              .to.emit(marvos, 'BidPlaced')
              .withArgs(bid.id, offer.id, bob.address)
          })

          it('should use balance when the account has balance and useBalance is true', async () => {
            const { marvos, admin, alice, bob, escrow, tokenA } =
              await loadTestWithTokenFixture()

            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithToken(
              marvos,
              bob,
              escrow,
              offer,
              tokenA.address,
            )

            await tokenA.connect(admin).transfer(bob.address, bid.tokenAmount)
            await tokenA.connect(bob).approve(marvos.address, bid.tokenAmount)

            await marvos.connect(alice).createOffer(offer, false)
            await marvos.connect(bob).placeBid(bid, false)

            // cancel and get everything back in balance
            await marvos.connect(bob).cancelBid(bid.id)

            // no more allowance
            expect(await tokenA.allowance(bob.address, marvos.address)).to.eq(0)

            const newBid = await generateBidWithToken(
              marvos,
              bob,
              escrow,
              offer,
              tokenA.address,
            )

            // but since the user has balance - we can use it
            await expect(marvos.connect(bob).placeBid(newBid, true))
              .to.emit(marvos, 'BidPlaced')
              .withArgs(newBid.id, offer.id, bob.address)
          })

          it('should create an offer if the correct amount of ETH is transferred to the contract', async () => {
            const { marvos, alice, bob, escrow } = await loadTestWithTokenFixture()

            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithToken(
              marvos,
              bob,
              escrow,
              offer,
              await marvos.COIN_ADDRESS(),
            )

            await marvos.connect(alice).createOffer(offer, false)
            await expect(
              marvos.connect(bob).placeBid(bid, false, {
                value: bid.tokenAmount,
              }),
            )
              .changeEtherBalances([marvos.address, bob.address], [bid.tokenAmount, 0])
              .to.emit(marvos, 'BidPlaced')
              .withArgs(bid.id, offer.id, bob.address)
          })
        })
      })
    })

    describe('cancel', () => {
      describe('validations', () => {
        it('should revert if the caller is different from the bid creator', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer)
          await marvos.connect(alice).createOffer(offer, false)
          await marvos.connect(bob).placeBid(bid, false)

          await expect(marvos.connect(alice).cancelBid(bid.id))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.Unauthorized)
        })

        it('should revert if the bid has already been canceled', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer)
          await marvos.connect(alice).createOffer(offer, false)
          await marvos.connect(bob).placeBid(bid, false)
          await marvos.connect(bob).cancelBid(bid.id)

          await expect(marvos.connect(bob).cancelBid(bid.id))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.BidStatusInvalid)
        })

        it('should revert if the bid has already been accepted', async () => {
          const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
          const offer = await generateOfferWithoutToken(marvos, alice, escrow)
          const bid = await generateBidWithoutToken(marvos, bob, escrow, offer)
          await marvos.connect(alice).createOffer(offer, false)
          await marvos.connect(bob).placeBid(bid, false)
          await marvos.connect(alice).acceptBid(bid.id)

          await expect(marvos.connect(bob).cancelBid(bid.id))
            .to.be.revertedWith('StandardError')
            .withArgs(StandardError.BidStatusInvalid)
        })
      })

      describe('effects', () => {
        describe('when the bid has no token', () => {
          it('should update the bid status and set it to canceled', async () => {
            const { marvos, alice, bob, escrow } = await loadBaseTestFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithoutToken(marvos, bob, escrow, offer)
            await marvos.connect(alice).createOffer(offer, false)
            await marvos.connect(bob).placeBid(bid, false)

            const status = 3
            await expect(marvos.connect(bob).cancelBid(bid.id))
              .to.emit(marvos, 'BidStatusChanged')
              .withArgs(bid.id, status)
            const bidOnChain = await marvos.bids(bid.id)
            expect(bidOnChain.status).to.eq(status)
          })
        })

        describe('when the bid has a token', () => {
          it('should refund the token amount to the user', async () => {
            const { marvos, admin, alice, bob, escrow, tokenA } =
              await loadTestWithTokenFixture()
            const offer = await generateOfferWithoutToken(marvos, alice, escrow)
            const bid = await generateBidWithToken(
              marvos,
              bob,
              escrow,
              offer,
              tokenA.address,
            )

            await tokenA.connect(admin).transfer(bob.address, bid.tokenAmount)
            await tokenA.connect(bob).approve(marvos.address, bid.tokenAmount)

            await marvos.connect(alice).createOffer(offer, false)
            await marvos.connect(bob).placeBid(bid, false)

            const status = 3
            await expect(marvos.connect(bob).cancelBid(bid.id))
              .to.emit(marvos, 'BidStatusChanged')
              .withArgs(offer.id, status)
              .to.emit(marvos, 'BalanceCredited')
              .withArgs(bob.address, tokenA.address, 3, bid.tokenAmount, bid.tokenAmount)

            const bidOnChain = await marvos.bids(bid.id)
            expect(bidOnChain.status).to.eq(status)

            const balanceOnChain = await marvos.tokenBalances(bob.address, tokenA.address)
            expect(balanceOnChain).to.eq(bid.tokenAmount)
          })
        })
      })
    })
  })
})
