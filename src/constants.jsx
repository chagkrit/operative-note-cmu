// Constants for operative note form

const WARDS = ["ศญ.2", "ศญ.3", "ศช.2", "ศช.3", "พิเศษ2", "พิเศษ3", "พิเศษ8", "พิเศษ9", "พิเศษ10", "ICU", "OPD", "อื่นๆ"];
const ROOMS = ["SP1", "SP2", "SP3", "SP4", "SP5", "SP6", "SP7", "SP8", "SP9", "SP10", "3_1", "3_2", "3_3", "3_4", "Minor OR", "OPD OR"];
const SIDES = ["Right", "Left", "Bilateral"];
const GENDERS = ["หญิง", "ชาย", "อื่นๆ"];
const ANESTHESIA_TYPES = ["General Anesthesia", "Regional Anesthesia", "Local Anesthesia"];
const POSITIONS = ["supine", "prone", "lateral decubitus", "lithotomy", "beach chair", "semi-supine with arm abduction"];
const INCISIONS = ["Curvilinear", "Transverse", "Kocher (collar)", "Elliptical", "Periareolar", "Radial", "IMF", "Oblique", "Vertical", "Wise-pattern"];
const OP_TYPES = [
  "Excision under US guide",
  "Excision",
  "Simple mastectomy",
  "Simple mastectomy with SLN Bx",
  "Modified radical mastectomy",
  "Breast conserving surgery",
  "Breast conserving surgery with SLN Bx",
  "ALND",
  "Total thyroidectomy",
  "Hemithyroidectomy",
  "Lobectomy",
  "Central neck dissection",
  "Lateral neck dissection",
  "Parathyroidectomy",
  "Core needle biopsy",
  "FNA",
  "Port-A-Cath insertion",
  "Port-A-Cath removal",
  "I&D",
  "Incisional biopsy",
  "Excisional biopsy",
  "Other"
];
const BIRADS = ["0", "1", "2", "3", "4A", "4B", "4C", "5", "6"];
const THYROID_RISK = ["TR1 Benign", "TR2 Not suspicious", "TR3 Mildly suspicious", "TR4 Moderately suspicious", "TR5 Highly suspicious"];
const DRAINS_OPTS = ["None", "Redivac drain x1", "Redivac drain x2", "Penrose drain", "Jackson-Pratt drain", "Blake drain"];
const COMPLICATION_OPTS = ["None", "Minor bleeding", "Pneumothorax", "Nerve injury", "Airway issue", "Hypotension", "Other"];
const PATIENT_CONDITIONS = [
  "Stable: Successful surgery and are stable, with normal vital signs",
  "Stable: transferred to PACU",
  "Stable: transferred to ICU",
  "Unstable: transferred to ICU"
];

const SURGEONS = ["อ.อารีวรรณ", "อ.กีรติ", "อ.ปัญจพร", "อ.จักรกริช", "อ.จุฬารัตน์"];

// Drive folder the user wants backups mirrored to
const DRIVE_FOLDER_URL = "https://drive.google.com/drive/folders/1Xf1NdhElh1P6IgbDeBmyZ1N9flFxpJt6?usp=share_link";
const DRIVE_FOLDER_ID = "1Xf1NdhElh1P6IgbDeBmyZ1N9flFxpJt6";

window.OP_CONST = {
  WARDS, ROOMS, SIDES, GENDERS, ANESTHESIA_TYPES, POSITIONS, INCISIONS,
  OP_TYPES, BIRADS, THYROID_RISK, DRAINS_OPTS, COMPLICATION_OPTS, PATIENT_CONDITIONS,
  SURGEONS, DRIVE_FOLDER_URL, DRIVE_FOLDER_ID
};
