# Marvos External Data Spec

The Marvos core contract powers the exchange process. However, data such as offer token pricing is not stored on chain.
This allows maximum flexibility in order processing, allowing for unique pricing structures, negotiations, etc. As a
result, clients have a responsibility to ensure data visibility so that traders can have a seamless experience.

The EDS details the specification for the data fields. We have chosen to define the EDS using TypeScript type
definitions because of the simplicity and expressiveness of TypeScript's type system. The type definitions can be found
[here](https://github.com/marvosprotocol/core/blob/main/evm/external-data-spec/spec.ts).

### Non-Fungible External Item Registry 

| NFSI Code  | ID Format                                      | Description          |
|------------|------------------------------------------------|----------------------|
| nft        | SHA256(nfei:chainCode/collectionAddress/nftId) | NFTs                 |
| sm-account | SHA256(nfei:shortestSMHostname/username)       | Social Media Account |
