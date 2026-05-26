# Community Collections catalog

Public **Community Collections** shown to users on `/collections`, home/mobile filters, and add-to-collection pickers. Data is loaded from the API at runtime — this file is a generated snapshot.

**Out of scope:** Private bookmark folders (`/bookmarks`).

## How this file is generated

- **Generated at:** 2026-05-25T10:59:49.226Z
- **API base:** http://127.0.0.1:5000
- **Regenerate:** `npm run export:community-collections-catalog` (backend must be running)

Override API URL: `COMMUNITY_COLLECTIONS_API_BASE=https://your-api.example npm run export:community-collections-catalog`

## Totals

| Metric | Count |
|--------|------:|
| All public collections | 202 |
| Parent topics (roots) | 8 |
| Sub-collections | 194 |
| Featured root topics | 8 |

## Where users see these collections

| Surface | Order |
|---------|-------|
| `/collections` browse topic chips | Parents with aggregate nugget count > 0; count desc, then name |
| `/collections` taxonomy sidebar | All parents A–Z; children A–Z under each parent |
| `/collections` Manage tab (admin) | Flat paginated list; default sort `created` desc |
| Home / mobile filter panel | Featured roots first (`featuredOrder`), then other roots A–Z; children A–Z per parent |
| Featured toolbar (`/api/collections/featured`) | Featured roots only; `featuredOrder` asc |

The browse header **“Latest Nuggets”** refers to the article feed, not collection sort order.

## Featured root collections

| Order | Name | ID | Nuggets |
|------:|------|----|--------:|
| 0 | Geopolitics | `69dac75e1b9e741dfd9d9809` | 53 |
| 0 | India (Focused) | `69dacf3a1b9e741dfd9d9c4c` | 74 |
| 0 | Markets & Investments | `69dac8481b9e741dfd9d98ab` | 399 |
| 0 | Podcast (Others) | `69e62a4e62f6eff351ea4f9a` | 43 |
| 0 | Podcasts (Markets, Investment & Others) | `69dac9ad1b9e741dfd9d995d` | 228 |
| 0 | Podcasts (Startups & Tech Focused) | `69dad5a91b9e741dfd9d9f8f` | 95 |
| 0 | VC Reports and Blogs | `69e62ade62f6eff351ea4fcf` | 287 |
| 15 | Money & Currency | `6994a7f84ed9f0baab8f9372` | 30 |

## Browse topic chips (aggregate count > 0)

Same ordering as [`CollectionsPage` `topicChipGroups`](../../src/pages/CollectionsPage.tsx).

| Rank | Name | ID | Aggregate nuggets |
|-----:|------|----|------------------:|
| 1 | Markets & Investments | `69dac8481b9e741dfd9d98ab` | 846 |
| 2 | Podcasts (Markets, Investment & Others) | `69dac9ad1b9e741dfd9d995d` | 423 |
| 3 | VC Reports and Blogs | `69e62ade62f6eff351ea4fcf` | 287 |
| 4 | Podcasts (Startups & Tech Focused) | `69dad5a91b9e741dfd9d9f8f` | 218 |
| 5 | India (Focused) | `69dacf3a1b9e741dfd9d9c4c` | 145 |
| 6 | Geopolitics | `69dac75e1b9e741dfd9d9809` | 111 |
| 7 | Podcast (Others) | `69e62a4e62f6eff351ea4f9a` | 87 |
| 8 | Money & Currency | `6994a7f84ed9f0baab8f9372` | 30 |

## Full taxonomy (parents and sub-collections)

Parent sort matches the home filter panel: featured roots by `featuredOrder`, then remaining roots A–Z. Sub-collections are A–Z under each parent.

### Geopolitics

- **ID:** `69dac75e1b9e741dfd9d9809`
- **Featured:** yes (order 0)
- **Direct nuggets:** 53
- **Sub-collections:** 14
- **Aggregate nuggets (parent + children):** 111

| Sub-collection | ID | Nuggets |
|----------------|----|--------:|
| Dr. Roy Casagranda | `69e637c52117e6a20dcda795` | 2 |
| Endgame with Gita Wirjawan | `69dc0aca3a56ddd2dc0bcfa9` | 3 |
| Foreign Affairs | `69eb29c1844fdb6c0353c0fe` | 4 |
| Geopolitical Cousins | `69eb2276844fdb6c0353adf1` | 4 |
| Glenn Diesen Podcast | `69db6d183bb9b9dc1ef5221b` | 2 |
| Ian Bremmer | `69e1e463e6b2c586b5813fb5` | 1 |
| John Mearsheimer | `69dac7d31b9e741dfd9d9868` | 20 |
| Judge Napolitano - Judging Freedom (Podcast) | `69db6d883bb9b9dc1ef5225b` | 2 |
| Michael Every | `69db66353bb9b9dc1ef51e82` | 13 |
| Prof. Jeffrey Sachs | `69ecd26be92c21eb9fd0c4af` | 1 |
| Robert Pape | `69e1e8b3ca2a99d69eb8253c` | 1 |
| Sarah C. M. Paine | `69eb2987844fdb6c0353c0ca` | 1 |
| Switzerland with Tom Switzer | `69db8b343bb9b9dc1ef525ce` | 2 |
| Trita Parsi | `69ecdb01e92c21eb9fd0d211` | 2 |

### India (Focused)

- **ID:** `69dacf3a1b9e741dfd9d9c4c`
- **Featured:** yes (order 0)
- **Direct nuggets:** 74
- **Sub-collections:** 19
- **Aggregate nuggets (parent + children):** 145

| Sub-collection | ID | Nuggets |
|----------------|----|--------:|
| "WTF is" with Nikhil Kamath | `69eb2aa7844fdb6c0353c2b0` | 2 |
| DSP Netra | `69db8e363bb9b9dc1ef52606` | 7 |
| FIRSTALK by IDFC FIRST Private | `69ecdc8ce92c21eb9fd0d48e` | 1 |
| Kenneth Andrade | `69db697f3bb9b9dc1ef52014` | 4 |
| Manish Chokhani | `69dacfab1b9e741dfd9d9c81` | 4 |
| Nandan Nilekani | `69db6c053bb9b9dc1ef521a7` | 3 |
| Neelkanth Mishra | `69db70343bb9b9dc1ef523c1` | 4 |
| Nilesh Shah | `69db6c913bb9b9dc1ef521ea` | 7 |
| Prashant Jain | `69db68e43bb9b9dc1ef51ff5` | 6 |
| Ridham Desai | `69db685d3bb9b9dc1ef51fce` | 2 |
| Ritesh Jain | `69db6e623bb9b9dc1ef522bf` | 6 |
| Saurabh Mukherjea | `69e1ec5eca2a99d69eb82911` | 2 |
| Sonia Shenoy | `69db6a2d3bb9b9dc1ef5209f` | 3 |
| Sridhar Sivaram | `69db6aee3bb9b9dc1ef5210c` | 1 |
| The Broad View | `69eb26cf844fdb6c0353b7e2` | 1 |
| The Core Report Podcast By Govindraj Ethiraj | `69e200e0620266f64de3229c` | 12 |
| The Ken | `69ecdde1e92c21eb9fd0d651` | 4 |
| Think School | `69eb2b5f844fdb6c0353c68b` | 1 |
| Vikas Khemani | `69e20605620266f64de329d2` | 1 |

### Markets & Investments

- **ID:** `69dac8481b9e741dfd9d98ab`
- **Featured:** yes (order 0)
- **Direct nuggets:** 399
- **Sub-collections:** 58
- **Aggregate nuggets (parent + children):** 846

| Sub-collection | ID | Nuggets |
|----------------|----|--------:|
| Alfred Lin (Sequoia Capital) | `69eb17772059f1ff12d40786` | 2 |
| AllianceBernstein Holding L.P. | `69e20854620266f64de32d2d` | 1 |
| Anas Alhajji | `69dacecf1b9e741dfd9d9c22` | 3 |
| Apollo Global | `69eb1d724c86b598d03c144f` | 32 |
| Balaji Srinivasan (Network School) | `69eb2b20844fdb6c0353c685` | 4 |
| Bessemer Venture Partners | `69eb23c3844fdb6c0353b130` | 7 |
| Bill Gurley (Benchmark) | `69eb1ff44c86b598d03c16a0` | 4 |
| BlackRock, Inc | `69e2078c620266f64de32c19` | 7 |
| Blackstone Inc. | `69e207ec620266f64de32cd7` | 9 |
| Brad W. Setser | `69e1e62b2f6b2d7ed952165c` | 0 |
| Bridgewater Associates | `69eb2f15844fdb6c0353d0ab` | 2 |
| Christopher Whalen | `69e634832117e6a20dcda67b` | 1 |
| Christopher Wood | `69dad0431b9e741dfd9d9cfa` | 2 |
| Coatue | `69eb1d364c86b598d03c1348` | 24 |
| Craig Tindale | `69ecdcf8e92c21eb9fd0d4e4` | 9 |
| Daniel Yergin | `69e20584620266f64de3290c` | 3 |
| David Rosenberg | `69e635402117e6a20dcda6dd` | 1 |
| David Rubenstein | `69e1e081e6b2c586b5813b47` | 4 |
| Deutsche Bank AG | `69e2087e620266f64de32db1` | 13 |
| Ed Yardeni | `69dad7621b9e741dfd9da0a7` | 10 |
| Financial Times | `69eb214e844fdb6c0353ac63` | 4 |
| Goldman Sachs | `69dad1371b9e741dfd9d9d68` | 49 |
| Henry Kravis | `69e635c62117e6a20dcda70d` | 3 |
| Howard S. Marks | `69dac8a11b9e741dfd9d98df` | 10 |
| J.P Morgan | `69dad26d1b9e741dfd9d9df8` | 24 |
| James Rickards | `69e1ed29ca2a99d69eb829e3` | 1 |
| Jeff Currie | `69dacd861b9e741dfd9d9b43` | 13 |
| Jeffrey Gundlach | `69dace991b9e741dfd9d9bfa` | 5 |
| Jeremy Grantham | `69e62aad62f6eff351ea4fc0` | 3 |
| Jeremy Siegel | `69ed0260e92c21eb9fd0e757` | 1 |
| Jim Bianco | `69dace281b9e741dfd9d9bc5` | 3 |
| Jim Grant | `69e20368620266f64de325d1` | 2 |
| Jim Zelter | `69e1e0fde6b2c586b5813c9f` | 1 |
| Jonathan D. Gray | `69e2632dcb59c0956d6ffe71` | 4 |
| Josef Schachter | `69db65cd3bb9b9dc1ef51e4a` | 3 |
| Kenneth Rogoff | `69ecdab3e92c21eb9fd0d1ae` | 3 |
| KKR & Co. | `69e206cd620266f64de32afe` | 13 |
| Liz Ann Sonders | `69e638d82117e6a20dcda82c` | 3 |
| Louis-Vincent Gave | `69dacdf61b9e741dfd9d9b98` | 4 |
| Luke Gromen | `69db63b33bb9b9dc1ef51d37` | 6 |
| Lyn Alden | `69dace071b9e741dfd9d9ba8` | 9 |
| Marc Rowan | `69e20654620266f64de32a65` | 5 |
| Marko Papic | `69db67663bb9b9dc1ef51f32` | 4 |
| Michael J. Howell | `69db65823bb9b9dc1ef51e3a` | 4 |
| Michael Mauboussin | `69e1e79aca2a99d69eb823f0` | 1 |
| Mike Wilson | `69e6395b2117e6a20dcda86a` | 4 |
| Morgan Stanley | `69dad1a91b9e741dfd9d9d9b` | 47 |
| Myrmikan Research by Daniel Oliver | `69e20509620266f64de3285b` | 2 |
| Nouriel Roubini | `69e203a7620266f64de32644` | 1 |
| Paul Krugman | `69e208e5620266f64de32e46` | 4 |
| Prof. Niall Ferguson | `69ecd2bee92c21eb9fd0c538` | 2 |
| Rajiv Jain (GQG Partners Inc) | `69eb2f7f844fdb6c0353d156` | 3 |
| Ray Dalio | `69e1e746ca2a99d69eb823eb` | 1 |
| Rick Rule | `69e1e92aca2a99d69eb8258b` | 3 |
| Rory Johnston (Commodity Context) | `69eb2d02844fdb6c0353ccd6` | 4 |
| Ruchir Sharma | `69db6b933bb9b9dc1ef5215b` | 3 |
| Stephen A. Schwarzman | `69eb2016844fdb6c0353aa09` | 1 |
| Torsten Slok (Apollo Global) | `69dad86d1b9e741dfd9da123` | 56 |

### Podcast (Others)

- **ID:** `69e62a4e62f6eff351ea4f9a`
- **Featured:** yes (order 0)
- **Direct nuggets:** 43
- **Sub-collections:** 12
- **Aggregate nuggets (parent + children):** 87

General Podcast

| Sub-collection | ID | Nuggets |
|----------------|----|--------:|
| Big Think | `69ecd81ae92c21eb9fd0c8f8` | 2 |
| Chris Williamson | `69e634bd2117e6a20dcda695` | 1 |
| Decoder Ring | `69eb15952059f1ff12d40732` | 1 |
| Dialectic Podcast with Jackson Dahl | `69eb22fe844fdb6c0353aec7` | 2 |
| Freakonomics Radio | `69e637502117e6a20dcda76a` | 3 |
| Hoover Institution | `69ecd32de92c21eb9fd0c601` | 5 |
| Nassim Nicholas Taleb | `69ed00d0e92c21eb9fd0e3e6` | 2 |
| Nate Hagens | `69ecd7b4e92c21eb9fd0c85b` | 4 |
| Peter McCormack | `69e634ee2117e6a20dcda6b0` | 2 |
| TED Talks | `69e62a5862f6eff351ea4f9f` | 4 |
| The Ezra Klein Show | `69eb2414844fdb6c0353b1c7` | 1 |
| University Podcast | `69ecd446e92c21eb9fd0c65c` | 17 |

### Podcasts (Markets, Investment & Others)

- **ID:** `69dac9ad1b9e741dfd9d995d`
- **Featured:** yes (order 0)
- **Direct nuggets:** 228
- **Sub-collections:** 63
- **Aggregate nuggets (parent + children):** 423

This collection includes podcasts focussing on Markets, Finance and others that don't fall within the Start-up and Tech segment

| Sub-collection | ID | Nuggets |
|----------------|----|--------:|
| 5 in 5 with ANZ | `69e638fe2117e6a20dcda83a` | 10 |
| Amundi | `69eb25f3844fdb6c0353b39a` | 3 |
| At Barron's | `69ecde3de92c21eb9fd0d7fa` | 3 |
| Baillie Gifford & Co | `69eb2879844fdb6c0353bca4` | 2 |
| Barclays Brief | `69eb2e4c844fdb6c0353cf1f` | 6 |
| Bloomberg Podcasts | `69dacbd01b9e741dfd9d9a48` | 23 |
| BORDIER & Cie Banquiers Privés | `69e638b02117e6a20dcda818` | 1 |
| Capital Allocators – Inside the Institutional Investment Industry | `69e1eb29ca2a99d69eb82762` | 1 |
| CFA Society | `69e1eca1ca2a99d69eb8295e` | 1 |
| Citi | `69eb171c2059f1ff12d40776` | 3 |
| CME Group | `69ed0317e92c21eb9fd0e998` | 1 |
| Conversations with Tyler (Mercatus Center Podcasts) | `69e635a62117e6a20dcda6ff` | 1 |
| DoubleLine Capital | `69ed02b0e92c21eb9fd0e84a` | 2 |
| Evercore's "Flow of Funds with Glenn Schorr" | `69eb293e844fdb6c0353bf67` | 1 |
| Excess Returns | `69e1ea89ca2a99d69eb82659` | 2 |
| Fisher Investments | `69eb30b1844fdb6c0353d42a` | 1 |
| Founders Podcast with David Senra | `69dacb701b9e741dfd9d9a38` | 8 |
| GlobalData TS Lombard | `69e63a312117e6a20dcda8cd` | 1 |
| Grey Matter Podcast with Declan Kelly | `69dc0a6c3a56ddd2dc0bcf6e` | 2 |
| HSBC | `69ecdc0ce92c21eb9fd0d3b3` | 7 |
| In Good Company | `69daca161b9e741dfd9d9991` | 9 |
| Inside China Business | `69eb17b02059f1ff12d4078e` | 0 |
| KBRA Podcast | `69eb2e02844fdb6c0353ce84` | 3 |
| Kopi Time Podcast (DBS) | `69db70983bb9b9dc1ef523d8` | 1 |
| Lex Fridman | `69dad3a31b9e741dfd9d9e60` | 3 |
| Macro Voices | `69ecde8de92c21eb9fd0d93c` | 8 |
| Maggie Lake Talking Markets | `69eb28b7844fdb6c0353bdf0` | 1 |
| Masters in Business with Barry Ritholtz | `69ecd91ce92c21eb9fd0cb56` | 2 |
| Money Maze Podcast | `69dad4fe1b9e741dfd9d9f36` | 4 |
| Moody's | `69eb307e844fdb6c0353d3a7` | 2 |
| Morningstar Inc. | `69eb301c844fdb6c0353d29b` | 4 |
| New York Life Investmentments Management | `69eb218d844fdb6c0353acaa` | 3 |
| Ninepoint Partners | `69ed03cae92c21eb9fd0eb8e` | 2 |
| Nomura Group | `69eb2644844fdb6c0353b52d` | 2 |
| Oaktree Capital Management | `69e2021f620266f64de32406` | 2 |
| On Investing (Charles Schwab) | `69ed0372e92c21eb9fd0eae6` | 1 |
| PGIM | `69eb2831844fdb6c0353bb59` | 3 |
| PIMCO Pod | `69eb14c62059f1ff12d40690` | 2 |
| PIMCO U.S. | `69e1eb42ca2a99d69eb82794` | 3 |
| RiskReversal Media | `69e6393e2117e6a20dcda85b` | 1 |
| S&P Global | `69eb2771844fdb6c0353b94c` | 2 |
| Saxo Bank | `69eb16cb2059f1ff12d40766` | 1 |
| Standard Chartered | `69e639c72117e6a20dcda880` | 1 |
| Stanford Graduate School of Business | `69e1ddefe6b2c586b58137f3` | 5 |
| Susquehanna International Group (SIG) | `69e636fe2117e6a20dcda75c` | 4 |
| The Alpha Exchange with Dean Curnutt | `69e202d7620266f64de3251b` | 2 |
| The CEO Signal (Semafor) | `69e135d274d6819b8f0768bc` | 1 |
| The Diary Of A CEO | `69e1dea8e6b2c586b58138b3` | 2 |
| The Knowledge Project Podcast | `69dad66e1b9e741dfd9da039` | 6 |
| The Master Investor Podcast with Wilfred Frost | `69dad29f1b9e741dfd9d9e0e` | 9 |
| The McKinsey Podcast | `69ecdefde92c21eb9fd0dab5` | 1 |
| The Milken Institute | `69e6362d2117e6a20dcda732` | 4 |
| The Monetary Matters Network | `69db654b3bb9b9dc1ef51e19` | 4 |
| The Tucker Carlson Show | `69dacc831b9e741dfd9d9ad1` | 7 |
| The University of Chicago | `69eb1aff4c86b598d03c0e12` | 0 |
| The Wharton School of the University of Pennsylvania | `69eb20f2844fdb6c0353abc8` | 1 |
| This Week in Business (Wharton) | `69ed0233e92c21eb9fd0e678` | 1 |
| Thoughtful Money with Adam Taggart - Podcast | `69e1e94bca2a99d69eb825ae` | 2 |
| Titans and Disruptors of Industry by Fortune Magazine | `69ef607d91957eaa4bd3f759` | 1 |
| WashingtonWise (Charles Schwab) | `69ed045fe92c21eb9fd0ed1e` | 1 |
| Wealthtrack | `69ecdfd2e92c21eb9fd0db57` | 2 |
| WellSaid Podcast by Wellington Management | `69eb14702059f1ff12d4064e` | 1 |
| WisdomTree Podcast | `69eb2ee6844fdb6c0353d02a` | 2 |

### Podcasts (Startups & Tech Focused)

- **ID:** `69dad5a91b9e741dfd9d9f8f`
- **Featured:** yes (order 0)
- **Direct nuggets:** 95
- **Sub-collections:** 28
- **Aggregate nuggets (parent + children):** 218

| Sub-collection | ID | Nuggets |
|----------------|----|--------:|
| 20VC with Harry Stebbings | `69db6f3e3bb9b9dc1ef5231c` | 9 |
| a16z | `69e1eb8dca2a99d69eb827f1` | 2 |
| Acquired Podcast | `69ecd1f6e92c21eb9fd0c2fe` | 10 |
| All-In Podcast | `69dacb1a1b9e741dfd9d9a18` | 8 |
| Apoorv Agrawal | `69e1e716ca2a99d69eb823e6` | 2 |
| Bg2 | `69dad3d11b9e741dfd9d9e7f` | 5 |
| Business Breakdowns | `69ef5fba91957eaa4bd3f65a` | 4 |
| Cheeky Pint | `69eb2359844fdb6c0353b03f` | 1 |
| Dwarkesh Podcast | `69dacc231b9e741dfd9d9a83` | 6 |
| Dylan Patel | `69ecdd50e92c21eb9fd0d571` | 5 |
| FYI - For Your Innovation | ARK Invest | `69ecdb64e92c21eb9fd0d2a4` | 1 |
| In Depth — a podcast from First Round | `69e633f02117e6a20dcda631` | 2 |
| Invest Like the Best with Patrick O'Shaughnessy | `69daca9e1b9e741dfd9d99cd` | 15 |
| Jensen Huang | `69dad5c61b9e741dfd9d9fc3` | 7 |
| Lenny's Podcast | `69db6e013bb9b9dc1ef5229a` | 8 |
| No Priors: AI, Machine Learning, Tech, & Startups | `69e637fb2117e6a20dcda7af` | 3 |
| Relentless | `69e6339e2117e6a20dcda5ff` | 3 |
| SemiAnalysis | `69dad6ff1b9e741dfd9da052` | 11 |
| Sequoia Capital | `69e1e97dca2a99d69eb825bc` | 1 |
| Silicon Valley Girl | `69eb2692844fdb6c0353b689` | 1 |
| Sourcery with Molly O'Shea | `69eb2ae5844fdb6c0353c49c` | 2 |
| South Park Commons | `69e6386f2117e6a20dcda7f3` | 1 |
| Stratechery by Ben Thompson | `69eb16392059f1ff12d40746` | 1 |
| Talks at Google | `69ed002fe92c21eb9fd0e28f` | 3 |
| The Core Memory Podcast | `69eb1c294c86b598d03c11f3` | 3 |
| The Stepchange Show | `69ef600a91957eaa4bd3f6c3` | 3 |
| Uncapped with Jack Altman | `69dad4d61b9e741dfd9d9f19` | 5 |
| Y Combinator | `69e638582117e6a20dcda7e5` | 1 |

### VC Reports and Blogs

- **ID:** `69e62ade62f6eff351ea4fcf`
- **Featured:** yes (order 0)
- **Direct nuggets:** 287
- **Sub-collections:** 0
- **Aggregate nuggets (parent + children):** 287

AI, Startups, VCs and connected.

_No sub-collections._

### Money & Currency

- **ID:** `6994a7f84ed9f0baab8f9372`
- **Featured:** yes (order 15)
- **Direct nuggets:** 30
- **Sub-collections:** 0
- **Aggregate nuggets (parent + children):** 30

_No sub-collections._

