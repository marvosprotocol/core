interface ExternalData {
  // additional text information provided
  note: string
  supply: Items
  demand: Items
}

type Items = null | ExternalItem | MultipleItemCombination

type ExternalItem = FungibleExternalItem | NonFungibleExternalItem

type FungibleExternalItem = FiatExternalItem | CryptoExternalItem

interface MultipleItemCombination {
  rule: 'and' | 'or'
  values: Array<ExternalItem | MultipleItemCombination>
}

interface NonFungibleExternalItem {
  // can be anything. but an NFEI directory is being maintained to
  // ensure consistency for common NFEI types
  // clients can support additional types
  // clients should use types from the NFEI directory to enable seamless interop
  type: string

  // an id that uniquely identifies the NFEI
  id: string

  properties: Record<string, NFEIProperty>
}

interface FiatExternalItem extends BaseFungibleExternalItem {
  type: 'fiat'
}

interface CryptoExternalItem extends BaseFungibleExternalItem {
  type: 'crypto'

  // network code from registry
  network: string

  // token address - when null, represents network native cryptocurrency
  address?: string
}

interface BaseFungibleExternalItem {
  // currency short code. eg: USD or ETH
  currency: string

  // amount in hex in smallest unit of currency. Like cents for USD or wei for ETH.
  value: string
}

// complex properties should be encoded as JSON
interface NFEIProperty {
  type: 'utf8' | 'integer' | 'decimal' | 'boolean'

  // data is the utf8 string for 'utf8'
  // 'true' or 'false' for 'boolean'
  // the integer encoded as hex for 'integer'
  // the decimal encoded as hex with the decimal point in place for 'decimal'
  data: string
}
