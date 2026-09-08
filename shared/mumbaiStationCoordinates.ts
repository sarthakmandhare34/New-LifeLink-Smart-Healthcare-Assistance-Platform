/**
 * Data-backed Mumbai suburban station coordinates for controlled development-directory markers.
 * Sources: BMC Mumbai Suburban Network 2025 KML (public domain) and OpenStreetMap Nominatim
 * only for the eight owner-supplied stations absent from the BMC KML.
 * These are station reference positions, not patient locations or live tracking data.
 */
export type MumbaiStationCoordinate = { latitude: number; longitude: number };

export const MUMBAI_STATION_COORDINATES: Readonly<Record<string, MumbaiStationCoordinate>> = {
  "Churchgate": {
    "latitude": 18.9352961818815,
    "longitude": 72.8271919878514
  },
  "Marine Lines": {
    "latitude": 18.9457881977143,
    "longitude": 72.8238144822946
  },
  "Charni Road": {
    "latitude": 18.9517165867492,
    "longitude": 72.8185706836947
  },
  "Grant Road": {
    "latitude": 18.9637045605152,
    "longitude": 72.8161783832855
  },
  "Mumbai Central": {
    "latitude": 18.9698932713685,
    "longitude": 72.8187988036057
  },
  "Mahalaxmi": {
    "latitude": 18.9822737979282,
    "longitude": 72.8241537111258
  },
  "Lower Parel": {
    "latitude": 18.9953187079519,
    "longitude": 72.830172471783
  },
  "Prabhadevi": {
    "latitude": 19.0075631386431,
    "longitude": 72.8361132046624
  },
  "Dadar": {
    "latitude": 19.0181435365389,
    "longitude": 72.843633420996
  },
  "Matunga Road": {
    "latitude": 19.028368597856,
    "longitude": 72.8469289503764
  },
  "Mahim Junction": {
    "latitude": 19.040716517382,
    "longitude": 72.8469183881933
  },
  "Bandra": {
    "latitude": 19.0555892333471,
    "longitude": 72.8403282370921
  },
  "Khar Road": {
    "latitude": 19.0698951076843,
    "longitude": 72.8401277252267
  },
  "Santacruz": {
    "latitude": 19.0825985273727,
    "longitude": 72.8417807673674
  },
  "Vile Parle": {
    "latitude": 19.0997393565481,
    "longitude": 72.8439996742096
  },
  "Andheri": {
    "latitude": 19.1171747947178,
    "longitude": 72.8465039707666
  },
  "Jogeshwari": {
    "latitude": 19.1365326519053,
    "longitude": 72.8489736708461
  },
  "Ram Mandir": {
    "latitude": 19.1516968179908,
    "longitude": 72.8501779534613
  },
  "Goregaon": {
    "latitude": 19.1648702815213,
    "longitude": 72.8496282479856
  },
  "Malad": {
    "latitude": 19.1868335617006,
    "longitude": 72.8489362808279
  },
  "Kandivali": {
    "latitude": 19.2045320761638,
    "longitude": 72.8520512299794
  },
  "Borivali": {
    "latitude": 19.2290634217488,
    "longitude": 72.8566489030573
  },
  "Dahisar": {
    "latitude": 19.2500070403722,
    "longitude": 72.8592814710169
  },
  "Mira Road": {
    "latitude": 19.2797406943242,
    "longitude": 72.8560972045312
  },
  "Bhayandar": {
    "latitude": 19.3114392227109,
    "longitude": 72.8525704477226
  },
  "Naigaon": {
    "latitude": 19.3513074099099,
    "longitude": 72.8462832948645
  },
  "Vasai Road": {
    "latitude": 19.3823802721053,
    "longitude": 72.8321461041926
  },
  "Nala Sopara": {
    "latitude": 19.4176755166077,
    "longitude": 72.8189145644195
  },
  "Virar": {
    "latitude": 19.4549995182516,
    "longitude": 72.8119284863236
  },
  "CSMT": {
    "latitude": 18.9402720285738,
    "longitude": 72.8357059779256
  },
  "Masjid": {
    "latitude": 18.9520915390942,
    "longitude": 72.8381997658401
  },
  "Sandhurst Road": {
    "latitude": 18.9608785429075,
    "longitude": 72.8395788297954
  },
  "Byculla": {
    "latitude": 18.976692518895,
    "longitude": 72.8327690068053
  },
  "Chinchpokli": {
    "latitude": 18.9870469487976,
    "longitude": 72.8329013428044
  },
  "Currey Road": {
    "latitude": 18.994110482723,
    "longitude": 72.8329987665172
  },
  "Parel": {
    "latitude": 19.0092440178425,
    "longitude": 72.8376259004038
  },
  "Matunga": {
    "latitude": 19.0274961050905,
    "longitude": 72.8502084014804
  },
  "Sion": {
    "latitude": 19.0477097291027,
    "longitude": 72.8640037012676
  },
  "Kurla": {
    "latitude": 19.0654774786936,
    "longitude": 72.8793543303778
  },
  "Vidyavihar": {
    "latitude": 19.0796208736982,
    "longitude": 72.8975799791421
  },
  "Ghatkopar": {
    "latitude": 19.0859890642817,
    "longitude": 72.9084657878744
  },
  "Vikhroli": {
    "latitude": 19.1119177689733,
    "longitude": 72.9281450869539
  },
  "Kanjur Marg": {
    "latitude": 19.128166320162,
    "longitude": 72.9281511337221
  },
  "Bhandup": {
    "latitude": 19.1424351550521,
    "longitude": 72.9376513107349
  },
  "Nahur": {
    "latitude": 19.1546251377825,
    "longitude": 72.946766137471
  },
  "Mulund": {
    "latitude": 19.1718662666882,
    "longitude": 72.9565534048963
  },
  "Thane": {
    "latitude": 19.1861152574207,
    "longitude": 72.9759337290526
  },
  "Kalwa": {
    "latitude": 19.1969032812792,
    "longitude": 72.9986747366214
  },
  "Mumbra": {
    "latitude": 19.1902742542868,
    "longitude": 73.0231397296511
  },
  "Diva Junction": {
    "latitude": 19.1889502669907,
    "longitude": 73.0429514521207
  },
  "Kopar": {
    "latitude": 19.2119353,
    "longitude": 73.0785982
  },
  "Dombivli": {
    "latitude": 19.218286062568,
    "longitude": 73.0868430181902
  },
  "Thakurli": {
    "latitude": 19.2260018478666,
    "longitude": 73.0979322946715
  },
  "Kalyan Junction": {
    "latitude": 19.2351909402425,
    "longitude": 73.1299711282289
  },
  "Shahad": {
    "latitude": 19.2443452121886,
    "longitude": 73.1583231567416
  },
  "Ambivli": {
    "latitude": 19.267809303216,
    "longitude": 73.1717128739798
  },
  "Titwala": {
    "latitude": 19.296877134864,
    "longitude": 73.203247161913
  },
  "Khadavli": {
    "latitude": 19.3568525,
    "longitude": 73.2192424
  },
  "Vasind": {
    "latitude": 19.4068464515156,
    "longitude": 73.2676652674631
  },
  "Asangaon": {
    "latitude": 19.4393598,
    "longitude": 73.307708
  },
  "Atgaon": {
    "latitude": 19.5035935,
    "longitude": 73.3282184
  },
  "Thansit": {
    "latitude": 19.5505104,
    "longitude": 73.3521013
  },
  "Khardi": {
    "latitude": 19.5804434,
    "longitude": 73.3940778
  },
  "Kasara": {
    "latitude": 19.64597,
    "longitude": 73.4723586
  },
  "Vithalwadi": {
    "latitude": 19.2282722390585,
    "longitude": 73.1492569841108
  },
  "Ulhasnagar": {
    "latitude": 19.21808971954,
    "longitude": 73.1631032188065
  },
  "Ambernath": {
    "latitude": 19.2101305480555,
    "longitude": 73.1844317400222
  },
  "Badlapur": {
    "latitude": 19.1668331363957,
    "longitude": 73.2388025511903
  },
  "Vangani": {
    "latitude": 19.094393395304,
    "longitude": 73.3007405284918
  },
  "Shelu": {
    "latitude": 19.0634147978046,
    "longitude": 73.3178011533358
  },
  "Neral": {
    "latitude": 19.0268065536976,
    "longitude": 73.3185595294996
  },
  "Bhivpuri Road": {
    "latitude": 18.9700072031662,
    "longitude": 73.3314774682455
  },
  "Karjat": {
    "latitude": 18.9088351428397,
    "longitude": 73.3206443228044
  },
  "Palasdari": {
    "latitude": 18.8842927108596,
    "longitude": 73.3208308318587
  },
  "Kelavli": {
    "latitude": 18.8456945832501,
    "longitude": 73.3187810452539
  },
  "Dolavli": {
    "latitude": 18.8342636565215,
    "longitude": 73.3200621813635
  },
  "Lowjee": {
    "latitude": 18.8086214214537,
    "longitude": 73.3354354701634
  },
  "Khopoli": {
    "latitude": 18.7896170591886,
    "longitude": 73.3448726092399
  },
  "Dockyard Road": {
    "latitude": 18.9665629111886,
    "longitude": 72.8443114850277
  },
  "Reay Road": {
    "latitude": 18.9775506,
    "longitude": 72.8441011
  },
  "Cotton Green": {
    "latitude": 18.9864939574943,
    "longitude": 72.8432893293482
  },
  "Sewri": {
    "latitude": 18.9989313752645,
    "longitude": 72.854579130035
  },
  "Wadala Road": {
    "latitude": 19.016006309249,
    "longitude": 72.8589424803244
  },
  "GTB Nagar": {
    "latitude": 19.0380290585816,
    "longitude": 72.8643611543405
  },
  "Chunabhatti": {
    "latitude": 19.0517072445659,
    "longitude": 72.8689456446498
  },
  "Tilak Nagar": {
    "latitude": 19.0657803013233,
    "longitude": 72.8899762020043
  },
  "Chembur": {
    "latitude": 19.0625976174705,
    "longitude": 72.9012441362589
  },
  "Govandi": {
    "latitude": 19.0550932243739,
    "longitude": 72.9153943027253
  },
  "Mankhurd": {
    "latitude": 19.0481650219614,
    "longitude": 72.9317241491866
  },
  "Vashi": {
    "latitude": 19.0631172207064,
    "longitude": 72.9988965632495
  },
  "Sanpada": {
    "latitude": 19.0661147788721,
    "longitude": 73.0093493142319
  },
  "Juinagar": {
    "latitude": 19.0556163409323,
    "longitude": 73.0183903439259
  },
  "Nerul": {
    "latitude": 19.0334707818177,
    "longitude": 73.0182107815982
  },
  "Seawoods-Darave": {
    "latitude": 19.0219438755159,
    "longitude": 73.0191424206458
  },
  "CBD Belapur": {
    "latitude": 19.0190456436135,
    "longitude": 73.0390873339028
  },
  "Kharghar": {
    "latitude": 19.0261194215454,
    "longitude": 73.0593969394587
  },
  "Mansarovar": {
    "latitude": 19.0166539817185,
    "longitude": 73.0804701854415
  },
  "Khandeshwar": {
    "latitude": 19.0074679867507,
    "longitude": 73.0947598188553
  },
  "Panvel": {
    "latitude": 18.9905700254378,
    "longitude": 73.1213414488358
  },
  "Kings Circle": {
    "latitude": 19.032266486955,
    "longitude": 72.8571690397359
  }
};
