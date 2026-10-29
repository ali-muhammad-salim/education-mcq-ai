import {afterEach,describe,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
import {assertOrigin} from '@/lib/security';
import {getBaseUrl} from '@/lib/google-auth';
describe('Runtime canonical origin',()=>{
  afterEach(()=>vi.unstubAllEnvs());
  it('uses the deployed runtime origin even if a different public URL was baked into the image',()=>{
    vi.stubEnv('APP_URL','https://deployed.example');vi.stubEnv('NEXT_PUBLIC_APP_URL','http://localhost:3000');
    expect(getBaseUrl()).toBe('https://deployed.example');
    expect(()=>assertOrigin(new NextRequest('http://container:3000/api',{method:'POST',headers:{origin:'https://deployed.example'}}))).not.toThrow();
    expect(()=>assertOrigin(new NextRequest('http://container:3000/api',{method:'POST',headers:{origin:'https://other.example'}}))).toThrow();
  });
});
