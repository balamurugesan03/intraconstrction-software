/* Create the Super Admin login, or reset its password if that email already exists.
   Run: node src/create-admin.js <email> <password> ["Full Name"] */
import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './models/index.js';

const [email, password, name = 'Super Admin'] = process.argv.slice(2);

async function run() {
  if (!email || !password) {
    console.error('Usage: node src/create-admin.js <email> <password> ["Full Name"]');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('✖ Password must be at least 6 characters');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);

  let user = await User.findOne({ email: email.toLowerCase().trim() });
  if (user) {
    user.password = password;
    user.role = 'Super Admin';
    user.active = true;
    await user.save();
    console.log(`✔ Password reset for ${user.email} (Super Admin)`);
  } else {
    user = await User.create({ name, email, password, role: 'Super Admin', designation: 'Managing Director' });
    console.log(`✔ Super Admin created: ${user.email}`);
  }
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
