import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

import ContentEditorShell from '../../components/studio/ContentEditorShell';
import { jobApi } from '../../api/content.api';
import JobEditorPage from './JobEditorPage';

function idOf(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  return value._id || value.id || null;
}

function cleanHtmlText(value) {
  return String(value || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function numberOrNull(value) {
  if (value === '' || value === undefined || value === null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function autosavePayload(form = {}) {
  const payload = {};
  const title = String(form.title || '').trim();
  const companyName = String(form.companyName || '').trim();
  const workLocation = String(form.workLocation || '').trim();

  if (title.length >= 5) payload.title = title;
  if (String(form.summary || '').length <= 1000) payload.summary = String(form.summary || '').trim();
  if (cleanHtmlText(form.bodyHtml)) payload.bodyHtml = form.bodyHtml;

  if (form.jobType) payload.jobType = form.jobType;
  if (companyName.length >= 2) payload.companyName = companyName;
  if (workLocation.length >= 3) payload.workLocation = workLocation;
  if (form.deadline) payload.deadline = form.deadline;

  if (form.salaryUnit) payload.salaryUnit = form.salaryUnit;
  if (form.experienceLevel) payload.experienceLevel = form.experienceLevel;
  payload.salaryMin = numberOrNull(form.salaryMin);
  payload.salaryMax = numberOrNull(form.salaryMax);
  payload.positionsCount = Math.max(Number(form.positionsCount) || 1, 1);
  payload.applicationMethod = String(form.applicationMethod || '').trim();
  payload.contactEmail = String(form.contactEmail || '').trim();
  payload.contactPhone = String(form.contactPhone || '').trim();
  payload.primaryAreaId = idOf(form.primaryAreaId);
  payload.thumbnailMediaId = idOf(form.thumbnailMediaId);

  return payload;
}

export default function JobStudioPage() {
  const { editorId } = useParams();
  const lastRecoveryRef = useRef('');
  const savingRef = useRef(false);

  useEffect(() => {
    if (!editorId) return undefined;

    const storageKey = `job-editor-draft:${editorId}`;

    const syncRecovery = async () => {
      if (savingRef.current) return;

      let raw = '';
      try {
        raw = window.localStorage.getItem(storageKey) || '';
      } catch {
        return;
      }

      if (!raw || raw === lastRecoveryRef.current) return;
      lastRecoveryRef.current = raw;

      try {
        const parsed = JSON.parse(raw);
        if (!parsed?.form) return;

        const payload = autosavePayload(parsed.form);
        if (!payload.title && !payload.bodyHtml) return;

        savingRef.current = true;
        await jobApi.update(editorId, payload);
      } catch {
        // Bản local vẫn được JobEditor giữ. Autosave server sẽ thử lại ở thay đổi kế tiếp.
      } finally {
        savingRef.current = false;
      }
    };

    const timer = window.setInterval(() => void syncRecovery(), 1400);
    void syncRecovery();

    return () => window.clearInterval(timer);
  }, [editorId]);

  return (
    <ContentEditorShell contentType="job">
      <JobEditorPage />
    </ContentEditorShell>
  );
}
