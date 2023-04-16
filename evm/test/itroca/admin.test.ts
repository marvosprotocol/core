/* eslint-disable @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access */
import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import '@nomiclabs/hardhat-ethers'
import '@nomiclabs/hardhat-waffle'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ITroca, ITroca__factory } from '../../build/types'
const { getContractFactory, getSigners } = ethers

describe('ITroca', () => {
  let itroca: ITroca
  let admin: SignerWithAddress
  let alice: SignerWithAddress
  let bob: SignerWithAddress
  let signers: SignerWithAddress[]

  const protocolFees = 25 // 0.2%
  const escrowFeeCommission = 500 // 5%
  const maxEscrowFeePercentage = 2000

  before(async () => {
    signers = await getSigners()
    admin = signers[0]
    alice = signers[1]
    bob = signers[2]
  })

  beforeEach(async () => {
    const itrocaFactory = (await getContractFactory('ITroca', admin)) as ITroca__factory
    itroca = (await upgrades.deployProxy(
      itrocaFactory,
      [protocolFees, escrowFeeCommission, maxEscrowFeePercentage],
      {
        initializer: 'initialize',
      },
    )) as ITroca
    await itroca.deployed()
    itroca = itroca.connect(alice)
  })

  describe('ITroca Admin Functions', () => {
    describe('setProtocolFeePercentage', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(itroca.connect(alice).setProtocolFeePercentage(30)).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should set the protocolFeePercentage field to a new value', async () => {
          await expect(itroca.connect(admin).setProtocolFeePercentage(30))
            .to.emit(itroca, 'ProtocolFeePercentageUpdated')
            .withArgs(30)
        })
      })
    })

    describe('setDisputeHandlerFeePercentageCommission', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(itroca.connect(bob).setDisputeHandlerFeePercentageCommission(250))
            .to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
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
          await expect(itroca.connect(bob).setMaxDisputeHandlerFeePercentage(1000)).to.be
            .reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
          await expect(itroca.connect(admin).setMaxDisputeHandlerFeePercentage(1000))
            .to.emit(itroca, 'MaxDisputeHandlerFeePercentageUpdated')
            .withArgs(1000)
        })
      })
    })

    describe('pause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await expect(itroca.connect(bob).pause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
          await expect(itroca.connect(admin).pause())
            .to.emit(itroca, 'Paused')
            .withArgs(admin.address)
        })
      })
    })

    describe('unpause', () => {
      describe('validations', () => {
        it('should revert when called by any address', async () => {
          await itroca.connect(admin).pause()
          await expect(itroca.connect(alice).unpause()).to.be.reverted
        })
      })

      describe('effects', () => {
        it('should update the commission on dispute handler fees', async () => {
          await itroca.connect(admin).pause()
          await expect(itroca.connect(admin).unpause())
            .to.emit(itroca, 'Unpaused')
            .withArgs(admin.address)
        })
      })
    })
  })
})
