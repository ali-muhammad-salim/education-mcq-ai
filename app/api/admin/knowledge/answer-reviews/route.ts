import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/security';
import { apiError } from '@/lib/api';
import { readAnswerReviews, decideLegacyAnswer } from '@/services/materials/legacy-answer-review';
export async function GET(req:NextRequest) {
  try { await requireUser(req,['ADMIN']); return NextResponse.json({items:await readAnswerReviews()},{headers:{'Cache-Control':'no-store'}}); } catch(error){return apiError(error);}
}
export async function PATCH(req:NextRequest) {
  try { const user=await requireUser(req,['ADMIN']); return NextResponse.json(await decideLegacyAnswer(user.id,await req.json())); } catch(error){return apiError(error);}
}
