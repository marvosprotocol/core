/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-assignment */
import { expect } from 'chai'
import { randomAddressString } from 'hardhat/internal/hardhat-network/provider/utils/random'
import { loadBaseTestFixture, loadTestWithTokenFixture } from '../utils'

describe('Marvos', () => {
  describe('Marvos Admin Functions', () => {
    describe('setProtocolFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { marvos, alice } = await loadBaseTestFixture()
          await expect(marvos.connect(alice).setProtocolFeePercentage(30)).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should set the protocolFeePercentage field to a new value', async () => {
          const { marvos, admin } = await loadBaseTestFixture()
          await expect(marvos.connect(admin).setProtocolFeePercentage(30))
            .to.emit(marvos, 'ProtocolFeePercentageUpdated')
            .withArgs(30)
        })
      })
    })

    describe('setDisputeHandlerFeePercentageCommission', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { marvos, alice } = await loadBaseTestFixture()
          await expect(
            marvos.connect(alice).setDisputeHandlerFeePercentageCommission(250),
          ).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
          const { marvos, admin } = await loadBaseTestFixture()
          await expect(
            marvos.connect(admin).setDisputeHandlerFeePercentageCommission(250),
          )
            .to.emit(marvos, 'DisputeHandlerFeePercentageCommissionUpdated')
            .withArgs(250)
        })
      })
    })

    describe('setMaxDisputeHandlerFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { marvos, alice } = await loadBaseTestFixture()
          await expect(marvos.connect(alice).setMaxDisputeHandlerFeePercentage(1000)).to
            .be.reverted
        })
      })

      describe('effects', () => {
        it('should update the maximum dispute handler fee', async () => {
          const { marvos, admin } = await loadBaseTestFixture()
          await expect(marvos.connect(admin).setMaxDisputeHandlerFeePercentage(1000))
            .to.emit(marvos, 'MaxDisputeHandlerFeePercentageUpdated')
            .withArgs(1000)
        })
      })
    })

    describe('setTokenBlacklisted', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { marvos, alice } = await loadBaseTestFixture()
          await expect(
            marvos.connect(alice).setTokenBlacklisted(randomAddressString(), true),
          ).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update a token blacklist status', async () => {
          const { marvos, admin, sampleToken } = await loadTestWithTokenFixture()
          await expect(
            marvos.connect(admin).setTokenBlacklisted(sampleToken.address, true),
          )
            .to.emit(marvos, 'TokenBlacklistStatusUpdated')
            .withArgs(sampleToken.address, admin.address, true)
        })
      })
    })

    describe('pause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { marvos, alice } = await loadBaseTestFixture()
          await expect(marvos.connect(alice).pause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should pause the contract', async () => {
          const { marvos, admin } = await loadBaseTestFixture()
          await expect(marvos.connect(admin).pause())
            .to.emit(marvos, 'Paused')
            .withArgs(admin.address)
        })
      })
    })

    describe('unpause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          const { marvos, admin, alice } = await loadBaseTestFixture()
          await marvos.connect(admin).pause()
          await expect(marvos.connect(alice).unpause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should unpause the contract', async () => {
          const { marvos, admin } = await loadBaseTestFixture()
          await marvos.connect(admin).pause()
          await expect(marvos.connect(admin).unpause())
            .to.emit(marvos, 'Unpaused')
            .withArgs(admin.address)
        })
      })
    })
  })
})
