import { isSchoolDay, weekdayName, semesterNumber, dailyActivityCost, hasActivity, KNOWLEDGE_REQUIRED, PASS_KNOWLEDGE, SEMESTER_DAYS, HD_REWARD, semesterDay, STUDIO_NAMES, WORK_PAY, type StudioSave } from './StudioState';

const cleanKnowledge = (value:number):number => Number.isFinite(value)?Math.floor(Math.max(0,Math.min(7,value))*2)/2:0;
const formatKnowledge = (value:number):string => Number.isInteger(value)?String(value):`${Math.floor(value)}½`;
const escape = (text:string):string => text.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'} as Record<string,string>)[char]);
const ACTIVITY = {
  class: { symbol:'▤', label:'Class', reward:'+1 Knowledge' },
  homework: { symbol:'✎', label:'Homework', reward:'+½ Knowledge' },
  work: { symbol:'◉', label:'Work', reward:`+${WORK_PAY} coins` },
} as const;
type ActivityKind = keyof typeof ACTIVITY;

/** Seven compact cells shared by the mission HUD and semester calendar. */
export function knowledgeBoxes(knowledge:number):string {
  const value=cleanKnowledge(knowledge);
  return `<div class="knowledge-boxes" role="img" aria-label="${value} of 7 Knowledge. 5 to pass; 7 for High distinction.">${Array.from({length:7},(_,index)=>{
    const filled=value>=index+1,half=!filled&&value>=index+.5;
    return `<span class="knowledge-box ${filled?'filled':half?'half':''} ${index===4?'pass-point':''}" aria-hidden="true"><span>${filled?'✓':half?'½':''}</span></span>`;
  }).join('')}</div>`;
}
function activityMark(kind:ActivityKind):string {
  const activity=ACTIVITY[kind];
  return `<span class="calendar-activity activity-${kind}" title="${activity.label} · ${activity.reward}"><span aria-hidden="true">${activity.symbol}</span>${activity.label}</span>`;
}

export function semesterPanel(s:StudioSave):string {
  const index=s.studio-1,start=s.semesterStarts[index]||s.day,elapsed=semesterDay(s);
  const knowledge=cleanKnowledge(s.knowledge[index]),cleared=s.cleared[index],canSubmit=!cleared&&knowledge>=PASS_KNOWLEDGE;
  const studioRecords=s.activities.filter(activity=>activity.studio===s.studio&&activity.day>=start&&activity.day<=s.day);
  const today=s.activities.filter(activity=>activity.day===s.day),used=Math.min(2,today.length),remaining=Math.max(0,2-used);
  const dayCell=(day:number,catchup=false):string=>{
    const absolute=start+day-1,current=absolute===s.day,past=absolute<s.day,schoolOpen=isSchoolDay(absolute);
    const weekday=weekdayName(absolute);
    const records=studioRecords.filter(activity=>activity.day===absolute);
    return `<li class="semester-day ${current?'current':past?'past':'future'} ${catchup?'catchup-day':''} ${schoolOpen?'':'weekend-day'}" data-semester-day="${day}" aria-label="${weekday}, studio day ${day}${schoolOpen?'':', school closed'}" ${current?'aria-current="date"':''}><div class="calendar-day-heading"><strong>Day ${day}</strong><small>${current?'Today':past?'Past':''}</small></div><span class="calendar-weekday">${weekday}</span>${schoolOpen?'':'<span class="calendar-school-closed">School closed</span>'}<div class="calendar-day-activities">${records.length?records.map(activity=>activityMark(activity.kind)).join(''):`<span class="calendar-day-empty">${past?'No activity logged':current?'Plan your day':'—'}</span>`}</div></li>`;
  };
  const extraDays=[...new Set([...studioRecords.filter(activity=>activity.day>=start+SEMESTER_DAYS).map(activity=>activity.day-start+1),...(elapsed>SEMESTER_DAYS?[elapsed]:[])])].sort((a,b)=>a-b);
  const recentExtra=extraDays.slice(-5);
  const status=cleared?(cleared==='study'&&knowledge>=KNOWLEDGE_REQUIRED?'High distinction · studio complete.':`Studio passed ${cleared==='fight'?'by instructor challenge':'through study'}.`):knowledge>=KNOWLEDGE_REQUIRED?'High distinction reached.':canSubmit?'Ready to pass. Submit now, or keep studying for High distinction at 7.':`${formatKnowledge(PASS_KNOWLEDGE-knowledge)} more Knowledge to pass.`;
  return `<div class="semester-panel"><div class="semester-topline"><div><span class="semester-studio-number">STUDIO ${String(s.studio).padStart(2,'0')}</span><h3>${escape(STUDIO_NAMES[index])}</h3></div><span class="semester-day-count ${elapsed>SEMESTER_DAYS?'is-catchup':''}">${elapsed>SEMESTER_DAYS?'Catch-up':`Day ${elapsed} / ${SEMESTER_DAYS}`}${elapsed>SEMESTER_DAYS?`<small>Day ${elapsed}</small>`:''}</span></div>
    <div class="semester-school-status ${isSchoolDay(s)?'school-open':'school-closed'}"><strong>${weekdayName(s)} · Semester ${semesterNumber(s)}</strong><span>${isSchoolDay(s)?'Classes run Monday–Friday.':'School is closed today.'} Work and homework are available every day.</span></div>
    <section class="semester-knowledge" aria-label="Study progress"><div class="semester-knowledge-heading"><strong>${formatKnowledge(knowledge)} <small>/ ${KNOWLEDGE_REQUIRED} Knowledge</small></strong><span>${PASS_KNOWLEDGE} to pass · ${KNOWLEDGE_REQUIRED} for HD</span></div>${knowledgeBoxes(knowledge)}<p class="semester-study-status">${status}</p><small class="semester-hd-reward">High distinction · ${HD_REWARD} coins once for completing the studio with 7 Knowledge.</small>${!cleared?`<button class="primary semester-submit" data-action="submit-study" ${canSubmit?'':'disabled'}>${canSubmit?'Submit studio · pass through study':`Reach ${PASS_KNOWLEDGE} Knowledge to submit`}</button>`:''}</section>
    <section class="semester-today" aria-label="Today’s activity budget"><div class="semester-today-heading"><strong>Today’s plan</strong><span>${used} / 2 activities used</span></div><div class="semester-budget-slots" role="img" aria-label="${used} of 2 daily activities used">${[0,1].map(slot=>`<span class="semester-budget-slot ${slot<used?'used':''}">${slot<used?activityMark(today[slot].kind):'<span class="budget-available">Available</span>'}</span>`).join('')}</div><p>${remaining?`Next activity: ${dailyActivityCost(s)} stamina · about half your maximum.`:'Each activity uses about half your maximum stamina.'}</p><small>${remaining?`${remaining} ${remaining===1?'activity':'activities'} left today.`:'Today’s activities are complete. Sleep at home for a new day.'}</small></section>
    <div class="semester-calendar-heading"><strong>${SEMESTER_DAYS}-day studio calendar</strong><span>Sleep at home to start the next day.</span></div><ol class="semester-calendar" aria-label="Semester days 1 to ${SEMESTER_DAYS}">${Array.from({length:SEMESTER_DAYS},(_,index)=>dayCell(index+1)).join('')}</ol>
    ${elapsed>SEMESTER_DAYS?`<section class="semester-catchup"><div class="semester-calendar-heading"><strong>Catch-up days</strong><span>Your Knowledge stays with you.</span></div><ol class="semester-calendar catchup-calendar" aria-label="Recent catch-up days">${recentExtra.map(day=>dayCell(day,true)).join('')}</ol>${extraDays.length>5?'<small>Showing the latest five recorded catch-up days.</small>':''}</section>`:''}
    <div class="semester-legend">${(['class','homework','work'] as ActivityKind[]).map(kind=>`<div class="semester-activity-key ${hasActivity(s,kind,kind==='work'?undefined:s.studio)?'done-today':''}">${activityMark(kind)}<strong>${ACTIVITY[kind].reward}</strong><small>${kind==='class'?'Monday–Friday · once per day':kind==='homework'?'Every day at home · once per day':'Every day · Lucky Lantern Noodles'}</small></div>`).join('')}</div>
    <p class="semester-cycle-note">Semesters 1 and 2 alternate every ${SEMESTER_DAYS} days. Your studio progress carries on.</p>
  </div>`;
}
