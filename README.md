# SIPL ![sipl](https://img.shields.io/npm/v/sipl)
Simple Instagram Photos Loader

CLI usage:
```
npx sipl %profile_username%
```

Programmatic usage:
```
import { downloadPostsOfUser } from "sipl/dist"
await downloadPostsOfUser(%profile_username%)
```

TODO: 
- [ ] Figure out, why script hangs sometimes
- [ ] Write some tests (lol)
- [x] CLI
- [ ] Ignore or download videos
- [x] Get post links automatically from profile
- [ ] PROPER CLI with command-line arguments parsing
- [ ] Allow programmatic usage
- [ ] Friendly errors
- [ ] Recover from (some) errors
