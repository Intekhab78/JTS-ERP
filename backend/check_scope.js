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
  const Branch = mongoose.model('Branch');

  const user = await User.findOne({ email: 'admin@erp.com' });
  const scope = await user.resolveScope(null);
  console.log('SCOPE:', scope);

  const companies = await LegalCompany.find({
    tenantId: scope.tenantId
  });
  console.log('COMPANIES IN TENANT:', companies.map(c => ({ id: c._id, name: c.name })));

  const branches = await Branch.find({
    tenantId: scope.tenantId
  });
  console.log('BRANCHES IN TENANT:', branches.map(b => ({ id: b._id, name: b.name, legalCompanyId: b.legalCompanyId })));

  process.exit(0);
});
