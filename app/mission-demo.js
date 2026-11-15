// AI assistance: OpenAI Codex. See docs/SI-USAGE.md.
import {buildGround, groundAction} from './ground-model.js';

const key = 'astravital-ground-actions-v1';
function read() {
  const actions = JSON.parse(localStorage.getItem(key) ?? '[]');
  if (!Array.isArray(actions)) throw new Error('Invalid local review history.');
  return actions;
}

export async function createMissionDemo({caseId} = {}) {
  const response = await fetch(new URL('./mission-demo.json',import.meta.url));
  if (!response.ok) throw new Error('The web demo snapshot could not be loaded.');
  const snapshot = await response.json();
  const reports = snapshot.reports.map(report => caseId === 'repeat' && snapshot.sharedRepeat ? {
    ...report, id:report.id + '-repeat',
    crew:report.crew.map(member => member.crewId === snapshot.sharedRepeat.crewId ? snapshot.sharedRepeat : member),
  } : report);
  function saveAction(input) {
    let actions;
    try { actions = read(); } catch (error) {
      throw new Error('Local storage is unavailable. The action was not saved.',{cause:error});
    }
    const previous = actions.find(action => action.id === input?.requestId);
    const {crew} = buildGround(reports,actions);
    const result = groundAction({crew,previous,at:new Date().toISOString()},input);
    if (!result.duplicate) {
      try { localStorage.setItem(key, JSON.stringify([...actions,result.entry])); }
      catch (error) { throw new Error('Local storage is unavailable. The action was not saved.',{cause:error}); }
    }
    return result;
  }
  return {
    async request(path, data) {
      if (path === 'ground') {
        let actions;
        try { actions = read(); } catch { actions = []; }
        return buildGround(reports,actions);
      }
      if (path === 'ground-action') {
        return globalThis.navigator?.locks
          ? navigator.locks.request(key,() => saveAction(data)) : saveAction(data);
      }
      throw new Error('This action requires the local mission profile.');
    },
  };
}
