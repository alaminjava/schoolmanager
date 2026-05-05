const ClassRoutine = require("../models/ClassRoutine");
const { createRoutine, updateRoutine } = require("../services/routineService");

async function getRoutines(req, res, next) {
  try {
    const query = {};
    if (req.query.className) query.className = req.query.className;
    if (req.query.day) query.day = req.query.day;
    if (req.query.status) query.status = req.query.status;

    const routines = await ClassRoutine.find(query).sort({ className: 1, day: 1, startTime: 1 });
    return res.json({ routines });
  } catch (error) {
    return next(error);
  }
}

async function createRoutineRecord(req, res, next) {
  try {
    const routine = await createRoutine(req.body, req.user.id);
    return res.status(201).json({ routine });
  } catch (error) {
    return next(error);
  }
}

async function updateRoutineRecord(req, res, next) {
  try {
    const routine = await updateRoutine(req.params.id, req.body, req.user.id);
    return res.json({ routine });
  } catch (error) {
    return next(error);
  }
}

async function deleteRoutineRecord(req, res, next) {
  try {
    const routine = await ClassRoutine.findByIdAndDelete(req.params.id);
    if (!routine) {
      return res.status(404).json({ message: "Routine record was not found." });
    }

    return res.json({ message: "Routine record deleted.", routine });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createRoutineRecord,
  deleteRoutineRecord,
  getRoutines,
  updateRoutineRecord,
};
