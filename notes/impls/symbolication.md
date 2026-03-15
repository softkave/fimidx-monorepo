- add another field that marks symbolication that can be bulk updated, used to symbolicate fields later that maybe lacked
- or should we list source maps and use them to fetch using configured fields, logs that belong to them to symbolicate?
- tests
- a way to cache in symbolicateStack
- what if the file is nested in defaultMapPathResolver
- take a 2nd look at run runSymbolication
- auto pickup version from fimidx-js cli
- return a full fimidara url, not just the folderpath
- take a second look at source-maps cli
- use fimidara multipart upload
- parse map into a db?
- remove listFimidaraFolder
- type instead of isZip

other

- support bulk write objs
- track how many calls there's been for a callback
- use fimidara's js sdk's downloadFolder when it's available
