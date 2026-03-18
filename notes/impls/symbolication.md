- add another field that marks symbolication that can be bulk updated, used to symbolicate fields later that maybe lacked
- or should we list source maps and use them to fetch using configured fields, logs that belong to them to symbolicate?
- tests
- take a 2nd look at run runSymbolication
- only .map files should be included in the zip file
- in originalPositionFromMongo, bulk read with or queries and build map
- bulk read what's needed from db in logs
- put symbolication data in redis for kv fast read
- consider not using a temp dir

other

- support bulk write objs
- track how many calls there's been for a callback
- use fimidara's js sdk's downloadFolder when it's available
- authenticate callback call
- move callbacks to different threads
