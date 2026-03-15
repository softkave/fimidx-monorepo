- add another field that marks symbolication that can be bulk updated, used to symbolicate fields later that maybe lacked
- or should we list source maps and use them to fetch using configured fields, logs that belong to them to symbolicate?
- batch process in deleteLocalSourceMapCacheEntriesOlderThanCycle and make a map of toDelete
- delete local source map entries in db after deleting locally
- source maps and stash folders on fimidara should come from env
- do we have statusCode on fimidara errors?
- in ensureTokenHasAccessToFolder, do a check rather just add again
- tests
- use zip only for source maps, zip is better, and don't reupload
- is adm-zip as fast as a local zip cli command?
- a way to cache in symbolicateStack
- what if the file is nested in defaultMapPathResolver
- take a 2nd look at run runSymbolication
- types for adm-zip, source-maps
- ensure our callbacks only run one at a time
- generate new js types/endpoint/mfdoc
- auto pickup version from fimidx-js cli
- return a full fimidara url, not just the folderpath
- take a second look at source-maps cli
- use fimidara multipart upload
- parse map into a db?

other

- support bulk write objs
- track how many calls there's been for a callback
- use fimidara's js sdk's downloadFolder when it's available
