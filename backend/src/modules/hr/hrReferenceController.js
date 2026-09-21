const Location = require('../../core/models/Location');
const Team = require('../../core/models/Team');
const Designation = require('../../core/models/Designation');
const JobLevel = require('../../core/models/JobLevel');

// @desc    Get all locations
// @route   GET /api/v1/hr/locations
// @access  Private
exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.find({ tenantId: req.user.tenantId, isActive: true });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a location
// @route   POST /api/v1/hr/locations
// @access  Private
exports.createLocation = async (req, res) => {
  try {
    const location = await Location.create({
      ...req.body,
      tenantId: req.user.tenantId
    });
    res.status(201).json(location);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all teams
// @route   GET /api/v1/hr/teams
// @access  Private
exports.getTeams = async (req, res) => {
  try {
    const teams = await Team.find({ tenantId: req.user.tenantId, isActive: true });
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a team
// @route   POST /api/v1/hr/teams
// @access  Private
exports.createTeam = async (req, res) => {
  try {
    const team = await Team.create({
      ...req.body,
      tenantId: req.user.tenantId
    });
    res.status(201).json(team);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all designations
// @route   GET /api/v1/hr/designations
// @access  Private
exports.getDesignations = async (req, res) => {
  try {
    const designations = await Designation.find({ tenantId: req.user.tenantId, isActive: true });
    res.json(designations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a designation
// @route   POST /api/v1/hr/designations
// @access  Private
exports.createDesignation = async (req, res) => {
  try {
    const designation = await Designation.create({
      ...req.body,
      tenantId: req.user.tenantId
    });
    res.status(201).json(designation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all job levels
// @route   GET /api/v1/hr/job-levels
// @access  Private
exports.getJobLevels = async (req, res) => {
  try {
    const jobLevels = await JobLevel.find({ tenantId: req.user.tenantId, isActive: true });
    res.json(jobLevels);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a job level
// @route   POST /api/v1/hr/job-levels
// @access  Private
exports.createJobLevel = async (req, res) => {
  try {
    const jobLevel = await JobLevel.create({
      ...req.body,
      tenantId: req.user.tenantId
    });
    res.status(201).json(jobLevel);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
