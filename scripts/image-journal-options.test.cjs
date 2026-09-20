const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {build, esc} = require('./image-journal.cjs');

const root = path.resolve(__dirname, '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pinpin-journal-options-'));
const base = {
  title:'Timber Tractor', scope:'Original standalone fiction.',
  workflow:'docs/storyboard/production/WORKFLOW.md',
  sourceNotes:['An original story.'], steps:['Inspect the approved cover.'],
  conclusion:'Visual review complete.', shots:[], report:path.join(tmp, 'report.html')
};
const render = overrides => {
  build({...base, ...overrides});
  return fs.readFileSync(base.report, 'utf8');
};

try {
  const legacy = render({});
  for (const text of ['Chapter 02', 'Chapter 2', 'Five landscapes', 'The Five-Shot Plan',
    'Reading the Original', 'Original chapter text', 'What Carries Forward from Chapter 1',
    'Repeatable workflow and Chapter 1 lessons', 'Review Before Characters']) {
    assert(legacy.includes(text), 'Legacy default missing: ' + text);
  }
  assert(legacy.includes('href="../?chapter=2&amp;lang=en"'));
  assert(legacy.includes('href="../../images/image58.png"'));

  const options = {
    eyebrow:'Mr. PinPin / Standalone / <Notebook>', lead:'Two localized covers.',
    statusLabel:'Localized review candidates.', sourceHeading:'Story & References',
    planHeading:'The Cover Plan', reviewHeading:'Cover Review',
    workflowLabel:'Production Workflow', footerNote:'Lettering edits only.',
    carryForwardHeading:'Production Lessons', carryForwardNotes:['Inspect <letters> & identity.'],
    navigation:[{href:'../?story=timber-tractor&lang=es', label:'Read <story>'},
      {path:base.workflow, label:'Workflow & notes'}],
    sourceLinks:[{path:'docs/storyboard/images/standalone/timber-tractor/title-v1.png', label:'Approved "cover"'},
      {href:'https://example.test/reference?a=1&b=2', label:'Reference & context'}]
  };
  const standalone = render(options);
  for (const key of ['eyebrow', 'lead', 'statusLabel', 'sourceHeading', 'planHeading',
    'reviewHeading', 'workflowLabel', 'footerNote', 'carryForwardHeading']) {
    assert(standalone.includes(esc(options[key])), 'Custom option missing: ' + key);
  }
  assert(standalone.includes('Inspect &lt;letters&gt; &amp; identity.'));
  assert(standalone.includes('href="../?story=timber-tractor&amp;lang=es">Read &lt;story&gt;</a>'));
  const relativeCover = path.relative(tmp, path.join(root, options.sourceLinks[0].path)).split(path.sep).join('/');
  assert(standalone.includes(`href="${esc(relativeCover)}">Approved &quot;cover&quot;</a>`));
  assert(standalone.includes('href="https://example.test/reference?a=1&amp;b=2"'));
  for (const text of ['Chapter 02', 'Chapter 2', 'Chapter 1', 'Five landscapes', 'Five-Shot',
    'Reading the Original', 'Original chapter text', 'image58.png', 'image96.png']) {
    assert(!standalone.includes(text), 'Standalone leaked legacy content: ' + text);
  }
  const empty = render({...options, navigation:[], sourceLinks:[], carryForwardNotes:[],
    eyebrow:'', lead:'', statusLabel:'', footerNote:''});
  assert(!empty.includes('<nav>'));
  assert(!empty.includes('Approved &quot;cover&quot;'));
  assert(!empty.includes('Production Lessons'));
  assert(!empty.includes('Five landscapes'));
  assert(!empty.includes('not an approved chapter'));
  console.log('PASS: legacy report defaults, standalone labels, navigation, source links, relative paths, escaping and explicit empty overrides.');
} finally {
  fs.rmSync(tmp, {recursive:true, force:true});
}
