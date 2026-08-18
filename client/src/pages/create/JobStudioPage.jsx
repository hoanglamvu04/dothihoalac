import ContentEditorShell from '../../components/studio/ContentEditorShell';
import JobEditorPage from './JobEditorPage';

export default function JobStudioPage() {
  return (
    <ContentEditorShell contentType="job">
      <JobEditorPage />
    </ContentEditorShell>
  );
}
