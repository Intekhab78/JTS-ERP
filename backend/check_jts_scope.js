const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./src/config/db');

connectDB().then(async () => {
  require('./src/core/models/Role');
  require('./src/core/models/LegalCompany');
  require('./src/core/models/Branch');
  require('./src/core/models/Company');
  const User = require('./src/core/models/User');
  const LegalCompany = mongoose.model('LegalCompany');

  const user = await User.findOne({ email: 'jts@gmail.com' }).populate('roleId');
  console.log('USER:', { email: user.email, role: user.roleId?.name, tenantId: user.tenantId });
  const scope = await user.resolveScope(null);
  console.log('SCOPE for jts@gmail.com:', scope);
  
  const companies = await LegalCompany.find({
    _id: { $in: scope.accessibleCompanyIds },
    tenantId: scope.tenantId
  });
  console.log('COMPANIES RETURNED:', companies.map(c => ({ id: c._id, name: c.name, tenantId: c.tenantId })));

  process.exit(0);
});
