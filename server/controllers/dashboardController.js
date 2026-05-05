const { getDashboardSummary } = require("../services/dashboardService");

async function getDashboard(req, res, next) {
  try {
    const dashboard = await getDashboardSummary();
    return res.json({ dashboard });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getDashboard,
};
