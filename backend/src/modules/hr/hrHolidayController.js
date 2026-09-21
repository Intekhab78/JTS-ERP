const HolidayCalendar = require('../../core/models/HolidayCalendar');
const Holiday = require('../../core/models/Holiday');

// --- HOLIDAY CALENDARS ---

exports.createCalendar = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const calendar = new HolidayCalendar({
      ...req.body,
      tenantId,
      createdBy: req.user.id
    });
    await calendar.save();
    res.status(201).json(calendar);
  } catch (error) {
    console.error('Error creating holiday calendar:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getCalendars = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const calendars = await HolidayCalendar.find({ tenantId })
      .populate('applicableBranches', 'name')
      .populate('applicableLocations', 'name')
      .sort('-year name');
    res.json(calendars);
  } catch (error) {
    console.error('Error fetching calendars:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateCalendar = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const calendar = await HolidayCalendar.findOneAndUpdate(
      { _id: req.params.id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    if (!calendar) return res.status(404).json({ message: 'Calendar not found' });
    res.json(calendar);
  } catch (error) {
    console.error('Error updating calendar:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteCalendar = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    
    // check if holidays exist
    const holidays = await Holiday.countDocuments({ calendarId: req.params.id, tenantId });
    if (holidays > 0) {
      return res.status(400).json({ message: 'Cannot delete calendar with existing holidays.' });
    }

    const result = await HolidayCalendar.deleteOne({ _id: req.params.id, tenantId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Calendar not found' });
    res.json({ message: 'Calendar deleted successfully' });
  } catch (error) {
    console.error('Error deleting calendar:', error);
    res.status(500).json({ message: 'Server error' });
  }
};


// --- HOLIDAYS ---

exports.createHoliday = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { calendarId } = req.params;
    
    // verify calendar
    const calendar = await HolidayCalendar.findOne({ _id: calendarId, tenantId });
    if (!calendar) return res.status(404).json({ message: 'Holiday calendar not found' });

    const holiday = new Holiday({
      ...req.body,
      calendarId,
      tenantId,
      createdBy: req.user.id
    });
    await holiday.save();
    res.status(201).json(holiday);
  } catch (error) {
    console.error('Error creating holiday:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.getHolidays = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { calendarId } = req.params;

    const holidays = await Holiday.find({ calendarId, tenantId }).sort('date');
    res.json(holidays);
  } catch (error) {
    console.error('Error fetching holidays:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const holiday = await Holiday.findOneAndUpdate(
      { _id: id, tenantId },
      { ...req.body, updatedBy: req.user.id },
      { returnDocument: 'after', runValidators: true }
    );
    
    if (!holiday) return res.status(404).json({ message: 'Holiday not found' });
    res.json(holiday);
  } catch (error) {
    console.error('Error updating holiday:', error);
    res.status(400).json({ message: error.message });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const result = await Holiday.deleteOne({ _id: id, tenantId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Holiday not found' });
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    console.error('Error deleting holiday:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
