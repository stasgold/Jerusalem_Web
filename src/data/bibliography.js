// 49 sources and the "attested but not shown" list.
import { cite } from '../model.js';

export const SourceKind = {
  ancient: 'Ancient texts',
  excavation: 'Excavation reports and surveys',
  synthesis: 'Syntheses and reconstructions',
  geodata: 'Georeferencing and reference photographs',
};

const src = (key, short, full, kind) => ({ key, short, full, kind });

export const sources = [
  // Ancient texts
  src('war', 'Josephus, War', 'Flavius Josephus, The Jewish War (c. 75-79 CE). Cited by book and section of the Greek text (Niese), as in the Loeb Classical Library edition, trans. H. St. J. Thackeray, 1927-1928.', 'ancient'),
  src('ant', 'Josephus, Antiquities', 'Flavius Josephus, Jewish Antiquities (c. 93-94 CE). Cited by book and section, as in the Loeb Classical Library edition, trans. R. Marcus, A. Wikgren and L. H. Feldman, 1930-1965.', 'ancient'),
  src('middot', 'Mishnah Middot', 'Mishnah, tractate Middot ("Measurements"), redacted c. 200 CE. Cited by chapter and mishnah.', 'ancient'),
  src('nt', 'New Testament', 'New Testament: Gospel of John and Acts of the Apostles (late first century CE). Cited by chapter and verse.', 'ancient'),

  // Excavation reports and surveys
  src('warren1884', 'Warren & Conder 1884', "Warren, C. and Conder, C. R., The Survey of Western Palestine: Jerusalem. London: Palestine Exploration Fund, 1884, with Warren's portfolio Plans, Elevations, Sections, etc., 1884.", 'excavation'),
  src('bliss1898', 'Bliss & Dickie 1898', 'Bliss, F. J. and Dickie, A. C., Excavations at Jerusalem, 1894-1897. London: Palestine Exploration Fund, 1898.', 'excavation'),
  src('weill1920', 'Weill 1920', 'Weill, R., La Cité de David: Compte rendu des fouilles exécutées à Jérusalem, sur le site de la ville primitive, campagne de 1913-1914. Paris: Geuthner, 1920.', 'excavation'),
  src('sukenik1930', 'Sukenik & Mayer 1930', 'Sukenik, E. L. and Mayer, L. A., The Third Wall of Jerusalem: An Account of Excavations. Jerusalem: University Press, 1930.', 'excavation'),
  src('hamilton1944', 'Hamilton 1944', 'Hamilton, R. W., "Excavations against the North Wall of Jerusalem, 1937-8", Quarterly of the Department of Antiquities in Palestine 10 (1944): 1-54.', 'excavation'),
  src('kon1947', 'Kon 1947', 'Kon, M., The Tombs of the Kings (Hebrew). Tel Aviv: Dvir, 1947.', 'excavation'),
  src('avigad1954', 'Avigad 1954', 'Avigad, N., Ancient Monuments in the Kidron Valley (Hebrew). Jerusalem: Bialik Institute, 1954.', 'excavation'),
  src('amiran1970', 'Amiran & Eitan 1970', 'Amiran, R. and Eitan, A., "Excavations in the Courtyard of the Citadel, Jerusalem, 1968-1969 (Preliminary Report)", Israel Exploration Journal 20 (1970): 9-17.', 'excavation'),
  src('benoit1971', 'Benoit 1971', 'Benoit, P., "L\'Antonia d\'Hérode le Grand et le forum oriental d\'Aelia Capitolina", Harvard Theological Review 64 (1971): 135-167.', 'excavation'),
  src('clermont1872', 'Clermont-Ganneau 1872', 'Clermont-Ganneau, C., "Une stèle du Temple de Jérusalem", Revue Archéologique 23 (1872): 214-234, 290-296.', 'excavation'),
  src('benarieh1974', 'Ben-Arieh & Netzer 1974', 'Ben-Arieh, S. and Netzer, E., "Excavations along the \'Third Wall\' of Jerusalem, 1972-1974", Israel Exploration Journal 24 (1974): 97-107.', 'excavation'),
  src('kenyon1974', 'Kenyon 1974', 'Kenyon, K. M., Digging Up Jerusalem. London: Ernest Benn, 1974.', 'excavation'),
  src('mazar1975', 'B. Mazar 1975', 'Mazar, B., The Mountain of the Lord. Garden City, NY: Doubleday, 1975.', 'excavation'),
  src('geva1981', 'Geva 1981', 'Geva, H., "The \'Tower of David\': Phasael or Hippicus?", Israel Exploration Journal 31 (1981): 57-65.', 'excavation'),
  src('avigad1983', 'Avigad 1983', 'Avigad, N., Discovering Jerusalem. Nashville: Thomas Nelson, 1983.', 'excavation'),
  src('netzer1983', 'Netzer & Ben-Arieh 1983', 'Netzer, E. and Ben-Arieh, S., "Remains of an Opus Reticulatum Building in Jerusalem", Israel Exploration Journal 33 (1983): 163-175.', 'excavation'),
  src('shiloh1984', 'Shiloh 1984', 'Shiloh, Y., Excavations at the City of David I, 1978-1982: Interim Report of the First Five Seasons. Qedem 19. Jerusalem: Hebrew University, 1984.', 'excavation'),
  src('bendov1985', 'Ben-Dov 1985', 'Ben-Dov, M., In the Shadow of the Temple: The Discovery of Ancient Jerusalem. New York: Harper & Row, 1985.', 'excavation'),
  src('pixner1989', 'Pixner, Chen & Margalit 1989', 'Pixner, B., Chen, D. and Margalit, S., "Mount Zion: The \'Gate of the Essenes\' Re-excavated", Zeitschrift des Deutschen Palästina-Vereins 105 (1989): 85-95.', 'excavation'),
  src('neaehl', 'NEAEHL 1993', 'Stern, E. (ed.), The New Encyclopedia of Archaeological Excavations in the Holy Land, vol. 2, s.v. "Jerusalem". Jerusalem: Israel Exploration Society and Carta, 1993.', 'excavation'),
  src('broshi1994', 'Broshi & Gibson 1994', 'Broshi, M. and Gibson, S., "Excavations along the Western and Southern Walls of the Old City of Jerusalem", in H. Geva (ed.), Ancient Jerusalem Revealed. Jerusalem: Israel Exploration Society, 1994, pp. 147-155.', 'excavation'),
  src('gibson1994', 'Gibson & Taylor 1994', 'Gibson, S. and Taylor, J. E., Beneath the Church of the Holy Sepulchre, Jerusalem: The Archaeology and Early History of Traditional Golgotha. London: Palestine Exploration Fund, 1994.', 'excavation'),
  src('avni1996', 'Avni & Greenhut 1996', 'Avni, G. and Greenhut, Z., The Akeldama Tombs: Three Burial Caves in the Kidron Valley, Jerusalem. IAA Reports 1. Jerusalem: Israel Antiquities Authority, 1996.', 'excavation'),
  src('reich2000', 'Reich & Billig 2000', 'Reich, R. and Billig, Y., "Excavations near the Temple Mount and Robinson\'s Arch, 1994-1996", in H. Geva (ed.), Ancient Jerusalem Revealed, reprinted and expanded edition. Jerusalem: Israel Exploration Society, 2000, pp. 340-350.', 'excavation'),
  src('geva2000', 'Geva (ed.) 2000-', 'Geva, H. (ed.), Jewish Quarter Excavations in the Old City of Jerusalem Conducted by Nahman Avigad, 1969-1982, vols. I-. Jerusalem: Israel Exploration Society, 2000-.', 'excavation'),
  src('gibson2005', 'Gibson 2005', 'Gibson, S., "The Pool of Bethesda in Jerusalem and Jewish Purification Practices of the Second Temple Period", Proche-Orient Chrétien 55 (2005): 270-293.', 'excavation'),
  src('reich2005', 'Reich & Shukron 2005', 'Reich, R. and Shukron, E., "The Siloam Pool in the Second Temple Period in Jerusalem" (Hebrew), Qadmoniot 38 (2005): 91-96.', 'excavation'),
  src('reich2011', 'Reich 2011', "Reich, R., Excavating the City of David: Where Jerusalem's History Began. Jerusalem: Israel Exploration Society, 2011.", 'excavation'),
  src('benami2011', 'Ben-Ami & Tchekhanovets 2011', 'Ben-Ami, D. and Tchekhanovets, Y., "Has the Adiabene Royal Family \'Palace\' Been Found in the City of David?", in K. Galor and G. Avni (eds.), Unearthing Jerusalem: 150 Years of Archaeological Research in the Holy City. Winona Lake: Eisenbrauns, 2011, pp. 231-239.', 'excavation'),
  src('onn2011', 'Onn, Weksler-Bdolah & Bar-Nathan 2011', 'Onn, A., Weksler-Bdolah, S. and Bar-Nathan, R., "Jerusalem, The Old City, Wilson\'s Arch and the Great Causeway: Preliminary Report", Hadashot Arkheologiyot: Excavations and Surveys in Israel 123 (2011).', 'excavation'),
  src('mazar2011', 'E. Mazar 2011', 'Mazar, E., The Walls of the Temple Mount. Jerusalem: Shoham Academic Research and Publication, 2011.', 'excavation'),
  src('avner2016', 'Avner & Arbib 2016', 'Avner, R. and Arbib, K., "New Excavations in the Russian Compound and Their Importance for the Study of the \'Third Wall\' and the Battle over Jerusalem", in New Studies in the Archaeology of Jerusalem and Its Region 10. Jerusalem, 2016.', 'excavation'),
  src('peleg2017', 'Peleg-Barkat 2017', "Peleg-Barkat, O., The Temple Mount Excavations in Jerusalem 1968-1978 Directed by Benjamin Mazar, Final Reports Volume V: Herodian Architectural Decoration and King Herod's Royal Portico. Qedem 57. Jerusalem: Hebrew University, 2017.", 'excavation'),
  src('reem2018', "Re'em 2018", "Re'em, A., The Qishle Excavation in the Old City of Jerusalem. Jerusalem: Israel Exploration Society, 2018.", 'excavation'),
  src('szanton2019', 'Szanton et al. 2019', 'Szanton, N., Hagbi, M., Uziel, J. and Ariel, D. T., "Pontius Pilate in Jerusalem: The Monumental Street from the Siloam Pool to the Temple Mount", Tel Aviv 46 (2019): 147-166.', 'excavation'),
  src('regev2020', 'Regev et al. 2020', 'Regev, J., Uziel, J., Lieberman, T., Solomon, A., Gadot, Y., Ben-Ami, D., Regev, L. and Boaretto, E., "Radiocarbon dating and microarchaeology untangle the history of Jerusalem\'s Temple Mount: A view from Wilson\'s Arch", PLoS ONE 15(6) (2020): e0233307.', 'excavation'),

  // Syntheses
  src('mildenberg1984', 'Mildenberg 1984', 'Mildenberg, L., The Coinage of the Bar Kokhba War. Typos 6. Aarau: Sauerländer, 1984.', 'synthesis'),
  src('holyland', 'Holyland Model', "Avi-Yonah, M. (design), Model of Jerusalem in the Second Temple Period, 1:50, built 1962-1966 for the Holyland Hotel and since 2006 at the Israel Museum, Jerusalem. Used as the visual model for battlements, corner towers and tiled roofs, from the project owner's photograph of it; these details are the model's interpretation, not excavated evidence.", 'synthesis'),
  src('bahat1990', 'Bahat 1990', 'Bahat, D., with Rubinstein, C. T., The Illustrated Atlas of Jerusalem. New York: Simon & Schuster, 1990.', 'synthesis'),
  src('ritmeyer2006', 'Ritmeyer 2006', 'Ritmeyer, L., The Quest: Revealing the Temple Mount in Jerusalem. Jerusalem: Carta and the Lamb Foundation, 2006.', 'synthesis'),
  src('netzer2006', 'Netzer 2006', 'Netzer, E., The Architecture of Herod, the Great Builder. Tübingen: Mohr Siebeck, 2006.', 'synthesis'),
  src('kloner2007', 'Kloner & Zissu 2007', 'Kloner, A. and Zissu, B., The Necropolis of Jerusalem in the Second Temple Period. Leuven: Peeters, 2007.', 'synthesis'),
  src('geva2014', 'Geva 2014', 'Geva, H., "Jerusalem\'s Population in Antiquity: A Minimalist View", Tel Aviv 41 (2014): 131-160.', 'synthesis'),
  src('gurevich2017', 'Gurevich 2017', 'Gurevich, D., "The Water Pools and the Pilgrimage to Jerusalem in the Late Second Temple Period", Palestine Exploration Quarterly 149 (2017): 103-134.', 'synthesis'),

  // Georeferencing
  src('osm', 'OpenStreetMap', "OpenStreetMap contributors, outline of the Temple Mount / Haram al-Sharif (relation 5862584), retrieved through Nominatim in November 2026. Used for the four corners of the enclosure, which fix the model's origin and orientation.", 'geodata'),
  src('photos', 'Reference photographs', 'Photographs of the standing masonry from Wikimedia Commons, sampled for the wall textures: Western Wall stones, close-up (Danielrosehill, CC BY 4.0); Hewn stones of the Little Western Wall (Davidbena, CC BY-SA 4.0); Wailing Place of Jews, showing drafted stones, Woodburytype of c. 1871-1876 (Rijksmuseum, CC0); Herodian tower masonry in the Citadel (Ian Scott, CC BY-SA 2.0); and three photographs supplied by the project owner (Western Wall from the plaza, the Old City wall close up, and a square-on view of the Western Wall used for block measurements). Listed in docs/PHOTO-SOURCES.md.', 'geodata'),
  src('wikicoords', 'Wikipedia coordinates', 'Point coordinates of surviving monuments as given in the corresponding English Wikipedia articles, retrieved November 2026. Used only to place monuments on the grid; typical precision 10 to 30 m.', 'geodata'),
];

export const byKey = Object.fromEntries(sources.map((s) => [s.key, s]));

/** Structures attested in the sources but left out because nothing fixes their position,
 *  or because they lie outside the modelled area. */
export const notRendered = [
  { name: "Herod's theatre", reason: 'Josephus says Herod built a theatre in Jerusalem, but no remains have been identified and proposed sites conflict.', citations: [cite('ant', '15.268')] },
  { name: 'Amphitheatre', reason: 'Described as "in the plain"; never located.', citations: [cite('ant', '15.268')] },
  { name: 'Hippodrome', reason: 'Mentioned south of the Temple in the events of 4 BCE; never located.', citations: [cite('war', '2.44'), cite('ant', '17.255')] },
  { name: 'Monuments of John Hyrcanus and Alexander Jannaeus', reason: 'Used by Josephus as landmarks during the siege, but their positions are known only relative to walls whose own lines are disputed.', citations: [cite('war', '5.259'), cite('war', '5.304')] },
  { name: "Jason's Tomb", reason: 'Excavated and well dated, but it lies about 2 km west of the Temple Mount, outside the modelled area.', citations: [cite('kloner2007', 'catalogue, Rehavia')] },
  { name: 'Underground passages of the Temple Mount gates', reason: "The ramps behind the Double, Triple, Barclay's and Warren's Gates survive in part, but the model shows the platform as a solid; only the gate openings are marked.", citations: [cite('warren1884', 'account of the Haram substructures'), cite('ritmeyer2006', 'chapter on the Herodian gates')] },
];
