// SMTP Diagnostic Script
// Tests connection to Gmail SMTP using the configured credentials

const nodemailer = require('nodemailer');

const config = {
  host: 'smtp.gmail.com',
  port: 587,
  user: 'brokenbuiltservices@gmail.com',
  pass: process.argv[2] || 'hbdt wcnq aexk snhd',  // accept pass as argument or use default
  to: 'brokenbuiltservices@gmail.com'
};

console.log('=== SMTP Diagnostic ===');
console.log(`Host: ${config.host}`);
console.log(`Port: ${config.port}`);
console.log(`User: ${config.user}`);
console.log(`Pass length: ${config.pass.length} chars`);
console.log(`Pass with spaces: ${config.pass.includes(' ') ? 'YES' : 'NO'}`);
console.log(`Pass stripped: ${config.pass.replace(/ /g, '')}`);
console.log('');

async function run() {
  // Test 1: Connection with spaces (as entered by user)
  console.log('--- Test 1: Connecting with spaces in password ---');
  try {
    const transporter1 = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      auth: { user: config.user, pass: config.pass },
      tls: { rejectUnauthorized: false }
    });
    await transporter1.verify();
    console.log('✅ SMTP Connection VERIFIED! (with spaces)');
    
    console.log('--- Sending test email ---');
    const info = await transporter1.sendMail({
      from: `"SMTP Test" <${config.user}>`,
      to: config.to,
      subject: '🔧 SMTP Diagnostic Test - ' + new Date().toISOString(),
      text: 'If you received this, the SMTP connection is working correctly with spaces in the password.'
    });
    console.log(`✅ Email sent! Message ID: ${info.messageId}`);
    
  } catch (err) {
    console.log(`❌ Test 1 FAILED (with spaces): ${err.message}`);
    console.log(`   Code: ${err.code || 'N/A'}`);
    console.log(`   Command: ${err.command || 'N/A'}`);
    
    // Test 2: Try WITHOUT spaces
    console.log('');
    console.log('--- Test 2: Connecting WITHOUT spaces in password ---');
    try {
      const transporter2 = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: false,
        auth: { user: config.user, pass: config.pass.replace(/ /g, '') },
        tls: { rejectUnauthorized: false }
      });
      await transporter2.verify();
      console.log('✅ SMTP Connection VERIFIED! (without spaces)');
      
      console.log('--- Sending test email ---');
      const info2 = await transporter2.sendMail({
        from: `"SMTP Test" <${config.user}>`,
        to: config.to,
        subject: '🔧 SMTP Diagnostic Test (no spaces) - ' + new Date().toISOString(),
        text: 'If you received this, the SMTP connection works WITHOUT spaces in the password.'
      });
      console.log(`✅ Email sent! Message ID: ${info2.messageId}`);
      
    } catch (err2) {
      console.log(`❌ Test 2 FAILED (without spaces): ${err2.message}`);
      console.log(`   Code: ${err2.code || 'N/A'}`);
      console.log(`   Command: ${err2.command || 'N/A'}`);
      
      // Test 3: Try port 465 (SSL)
      console.log('');
      console.log('--- Test 3: Trying port 465 (SSL) ---');
      try {
        const transporter3 = nodemailer.createTransport({
          host: config.host,
          port: 465,
          secure: true,
          auth: { user: config.user, pass: config.pass.replace(/ /g, '') }
        });
        await transporter3.verify();
        console.log('✅ SMTP Connection VERIFIED! (port 465)');
      } catch (err3) {
        console.log(`❌ Test 3 FAILED (port 465): ${err3.message}`);
        console.log(`   Code: ${err3.code || 'N/A'}`);
        console.log(`   Command: ${err3.command || 'N/A'}`);
      }
    }
  }
}

run().catch(console.error);
