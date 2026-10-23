import { NextRequest } from 'next/server';
import { handleUpload } from '@/services/ingestion/upload';
export async function POST(req:NextRequest){return handleUpload(req);}
