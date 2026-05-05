const SchoolSetting = require("../models/SchoolSetting");

const DEFAULT_SETTINGS = {
  schoolName: "Your School Name",
  subtitle: "An English Medium School",
  leftLogoUrl: "",
  rightLogoUrl: "",
  address: "School address here",
  phone: "",
  website: "",
  defaultExamTitle: "Progress Report",
  admissionNotice: "Admission open. Contact school office for details.",
  principalName: "Principal",
  resultRemarksDefault: "She/He has been consistently progressing.",
};

const editableFields = Object.keys(DEFAULT_SETTINGS);

async function getOrCreateSettings() {
  let settings = await SchoolSetting.findOne().sort({ createdAt: 1 });
  if (!settings) {
    settings = await SchoolSetting.create(DEFAULT_SETTINGS);
  }
  return settings;
}

function cleanText(value) {
  return String(value || "").trim();
}

async function getSchoolSettings(_req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    return res.json({ settings });
  } catch (error) {
    return next(error);
  }
}

async function updateSchoolSettings(req, res, next) {
  try {
    const settings = await getOrCreateSettings();
    editableFields.forEach((field) => {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        settings[field] = cleanText(req.body[field]);
      }
    });

    if (!settings.schoolName) {
      return res.status(400).json({ message: "School name is required." });
    }

    await settings.save();
    return res.json({ message: "School settings updated.", settings });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getSchoolSettings,
  updateSchoolSettings,
};
