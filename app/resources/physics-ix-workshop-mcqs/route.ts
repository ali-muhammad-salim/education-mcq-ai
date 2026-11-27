import { permanentRedirect } from 'next/navigation';
import { physicsIxWorkshop as workshop } from '@/lib/physicsIxWorkshop';

export function GET(request: Request) {
  permanentRedirect(workshop.href + new URL(request.url).search);
}
