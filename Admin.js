const Adminjs = require('adminjs');
const AdminJSExpress = require('@adminjs/express'); 
const AdminMongoose = require('@adminjs/mongoose');
const bycrypt = require('bcryptjs');
const Agency = require('./models/Agency');
const Admin = require('./models/Admin');



Adminjs.registerAdapter(AdminMongoose);

const adminOptions = {
  resources: [
    {
      resource: Agency,
      options: {
        properties: {
          password: {
            type: "password",
            isVisible: { list: false, edit: true, show: false },
          },
          role: { isVisible: false },
          createdBy: { isVisible: false },
        },
        actions: {
          new: {
            before: async (request, context) => { if (request.payload?.password) {
                request.payload.password = await bcrypt.hash(request.payload.password, 10);
                request.payload.role = "agency";
                request.payload.createdBy = context.currentAdmin._id;
              }
              return request;
            },
          },
        },
      },
    },
  ],
  branding: { companyName: "BusTicket Admin Panel" },
};

const adminJs = new AdminJS(adminOptions);

const adminRouter = AdminJSExpress.buildAuthenticatedRouter(adminJs, {
  authenticate: async (email, password) => {
    const admin = await Admin.findOne({ email });
    if (!admin) return null;
    const matched = await bcrypt.compare(password, admin.password);
    return matched ? admin : null;
  },
  cookiePassword: "supercookie",
});
module.exports = { adminJs, adminRouter };