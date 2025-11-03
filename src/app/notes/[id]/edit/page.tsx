'use client';

import { useParams } from 'next/navigation';
import EditNoteForm from './EditNoteForm';

export default function NoteEditPage() {
  const params = useParams();
  const noteId = params.id as string;

  return <EditNoteForm noteId={noteId} />;
}
