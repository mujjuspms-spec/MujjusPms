import { lazy, Suspense, useMemo, useRef, useState } from 'react';
import Icon from './Icon';
import { useI18n } from '../hooks/useI18n';
import { shipTheme } from '../services/shipThemes';

// Lazy-loaded — the WebGL scene (three.js + react-three-fiber) only
// downloads and mounts once someone actually opts into the 3D view, instead
// of being fetched and rendered on every project's Overview tab by default.
const Spaceship3D = lazy(() => import('./Spaceship3D'));

function milestoneKey(progress) {
  if (progress >= 100) return 'build.done';
  if (progress >= 75) return 'build.final';
  if (progress >= 50) return 'build.half';
  if (progress >= 25) return 'build.shape';
  if (progress > 0) return 'build.started';
  return 'build.notstarted';
}

export default function BuildWidget({ project, doneCount, totalCount, actualProgress, crew }) {
  const { t } = useI18n();
  const [dragProgress, setDragProgress] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [interior, setInterior] = useState(false);
  const [show3d, setShow3d] = useState(false);
  const trackRef = useRef(null);
  const theme = useMemo(() => shipTheme(project.id), [project.id]);

  const shownProgress = dragProgress ?? actualProgress;

  function pctFromClientY(clientY) {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (rect.bottom - clientY) / rect.height;
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  }

  function startDrag(e) {
    e.preventDefault();
    setDragging(true);
    setDragProgress(pctFromClientY(e.clientY));
    const onMove = (ev) => setDragProgress(pctFromClientY(ev.clientY));
    const onUp = () => {
      setDragging(false);
      setDragProgress(null);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  return (
    <>
      <div className="build-head">
        <div>
          <div className="build-head-title"><Icon name="i-sparkle" className="icon icon-sm" style={{ color: 'var(--brand-500)' }} />{t('build.title')}</div>
          <div className="build-head-sub">
            {totalCount > 0
              ? <>{t('build.complete')} the {project.name} launch — {doneCount}/{totalCount} {t('build.tasksdone')}</>
              : <>No tasks yet — add your first task to start the {project.name} build</>}
          </div>
        </div>
        <div style={{ textAlign: 'end' }}><div className="build-head-pct">{Math.round(shownProgress)}%</div></div>
      </div>

      <div className="build-body">
        <div className="build-stage-wrap">
          {show3d ? (
            <div className="build-stage-3d">
              <div className={`build-preview-badge${dragging && dragProgress !== actualProgress ? ' show' : ''}`}>{t('build.preview')}</div>
              {!interior && (
                <button className="build-hint-badge show" onClick={() => setInterior(true)} style={{ border: 0, cursor: 'pointer' }}>
                  <Icon name="i-target" className="icon icon-sm" />{t('build.clickhint')}
                </button>
              )}
              {interior && (
                <button className="btn btn-sm build-exit-btn" onClick={() => setInterior(false)}>
                  <Icon name="i-x" className="icon icon-sm" /> {t('common.close')}
                </button>
              )}
              <button className="btn btn-sm build-exit-btn" style={{ insetInlineStart: 10, insetInlineEnd: 'auto' }} onClick={() => setShow3d(false)}>
                <Icon name="i-x" className="icon icon-sm" /> Hide 3D view
              </button>
              <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--ink-muted)', fontSize: 12.5 }}>Loading 3D view…</div>}>
                <Spaceship3D progress={shownProgress} theme={theme} interior={interior} setInterior={setInterior} crew={crew} />
              </Suspense>
            </div>
          ) : (
            <div
              className="build-stage-3d"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, cursor: 'pointer' }}
              onClick={() => setShow3d(true)}
            >
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand-500)' }} className="tabular">{Math.round(shownProgress)}%</div>
              <button className="btn btn-secondary btn-sm" onClick={() => setShow3d(true)}>
                <Icon name="i-sparkle" className="icon icon-sm" /> Show 3D view
              </button>
            </div>
          )}
          <div className="build-milestone-label">{t(milestoneKey(Math.round(shownProgress)))}</div>
        </div>

        <div className="build-side">
          <div className="build-slider-wrap">
            <div
              ref={trackRef}
              className="build-slider-track"
              role="slider"
              tabIndex={0}
              aria-label={t('build.pullup')}
              aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(shownProgress)}
              onPointerDown={startDrag}
            >
              <div className="build-slider-fill" style={{ height: shownProgress + '%', transition: dragging ? 'none' : 'height .5s cubic-bezier(.22,.9,.3,1.2)' }} />
              <div className="build-slider-handle" style={{ bottom: shownProgress + '%', transition: dragging ? 'none' : 'bottom .5s cubic-bezier(.22,.9,.3,1.2)' }}>
                <svg viewBox="0 0 24 24"><path d="M12 5v14M6 11l6-6 6 6M6 13l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>
            <div className="build-slider-caption">{t('build.pullup')}</div>
          </div>
        </div>
      </div>
    </>
  );
}
