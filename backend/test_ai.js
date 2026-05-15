require('dotenv').config();
const mongoose = require('mongoose');
const Meeting = require('./models/Meeting');
const { summarizeMeeting } = require('./utils/claudeHelper');

async function testAI() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Connected to MongoDB');

  const meeting = await Meeting.findOne({ source: 'recording_import' });
  if (!meeting) {
     console.log('No meeting found to test AI.');
     process.exit(0);
  }

  const dummyTranscript = `
    Nithish: Hello everyone, welcome to the CRM discussion.
    Arin: Thanks Nithish. We need to decide on the Ptron implementation.
    Satyam: I think we should go with the ORAI Hub integration for their CRM.
    Nithish: Agreed. Let's set a deadline for next Friday.
    Arin: I will handle the technical documentation.
    Satyam: And I will talk to the sales team.
    Nithish: Great, meeting adjourned.
  `;

  console.log('🤖 Generating AI Summary...');
  const summary = await summarizeMeeting(dummyTranscript);
  
  if (summary) {
    console.log('✅ AI Summary Generated:');
    console.log(summary);
    
    meeting.transcript = dummyTranscript;
    meeting.summary = summary;
    await meeting.save();
    console.log('💾 Meeting updated with AI summary.');
  } else {
    console.log('❌ AI Summary failed (check ANTHROPIC_API_KEY).');
  }

  process.exit(0);
}

testAI();
