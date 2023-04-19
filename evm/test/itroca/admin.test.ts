/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
import { expect } from 'chai'
import { randomAddressString } from 'hardhat/internal/hardhat-network/provider/utils/random'
import { loadBaseTestFixture, loadTestWithTokenFixture } from '../utils'

describe('ITroca', () => {
  describe('ITroca Admin Functions', () => {
    describe('setProtocolFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { itroca, alice } = await loadBaseTestFixture()
          await expect(itroca.connect(alice).setProtocolFeePercentage(30)).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should set the protocolFeePercentage field to a new value', async () => {
          const { itroca, admin } = await loadBaseTestFixture()
          await expect(itroca.connect(admin).setProtocolFeePercentage(30))
            .to.emit(itroca, 'ProtocolFeePercentageUpdated')
            .withArgs(30)
        })
      })
    })

    describe('setDisputeHandlerFeePercentageCommission', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { itroca, alice } = await loadBaseTestFixture()
          await expect(
            itroca.connect(alice).setDisputeHandlerFeePercentageCommission(250),
          ).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
          const { itroca, admin } = await loadBaseTestFixture()
          await expect(
            itroca.connect(admin).setDisputeHandlerFeePercentageCommission(250),
          )
            .to.emit(itroca, 'DisputeHandlerFeePercentageCommissionUpdated')
            .withArgs(250)
        })
      })
    })

    describe('setMaxDisputeHandlerFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { itroca, alice } = await loadBaseTestFixture()
          await expect(itroca.connect(alice).setMaxDisputeHandlerFeePercentage(1000)).to
            .be.reverted
        })
      })

      describe('effects', () => {
        it('should update the maximum dispute handler fee', async () => {
          const { itroca, admin } = await loadBaseTestFixture()
          await expect(itroca.connect(admin).setMaxDisputeHandlerFeePercentage(1000))
            .to.emit(itroca, 'MaxDisputeHandlerFeePercentageUpdated')
            .withArgs(1000)
        })
      })
    })

    describe('setTokenBlacklisted', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { itroca, alice } = await loadBaseTestFixture()
          await expect(
            itroca.connect(alice).setTokenBlacklisted(randomAddressString(), true),
          ).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update a token blacklist status', async () => {
          const { itroca, admin, sampleToken } = await loadTestWithTokenFixture()
          await expect(
            itroca.connect(admin).setTokenBlacklisted(sampleToken.address, true),
          )
            .to.emit(itroca, 'TokenBlacklistStatusUpdated')
            .withArgs(sampleToken.address, admin.address, true)
        })
      })
    })

    describe('pause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { itroca, alice } = await loadBaseTestFixture()
          await expect(itroca.connect(alice).pause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should pause the contract', async () => {
          const { itroca, admin } = await loadBaseTestFixture()
          await expect(itroca.connect(admin).pause())
            .to.emit(itroca, 'Paused')
            .withArgs(admin.address)
        })
      })
    })

    describe('unpause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { itroca, admin, alice } = await loadBaseTestFixture()
          await itroca.connect(admin).pause()
          await expect(itroca.connect(alice).unpause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should unpause the contract', async () => {
          const { itroca, admin } = await loadBaseTestFixture()
          await itroca.connect(admin).pause()
          await expect(itroca.connect(admin).unpause())
            .to.emit(itroca, 'Unpaused')
            .withArgs(admin.address)
        })
      })
    })
  })
})
