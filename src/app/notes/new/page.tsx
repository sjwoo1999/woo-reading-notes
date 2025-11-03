import NoteForm from '../NoteForm';

export const metadata = {
  title: '새 노트 작성 - 리딩 노트',
  description: '새로운 독서 노트를 작성합니다',
};

export default function NewNotePage() {
  return (
    <div className="space-y-4">
      <NoteForm />
    </div>
  );
}
