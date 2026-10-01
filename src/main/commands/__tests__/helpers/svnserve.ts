import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';

import { runSvn } from '../../svn-client';

export interface RunningSvnserve {
  port: number;
  process: ChildProcess;
  stop: () => void;
}

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo;
      server.close(() => resolve(port));
    });
  });
}

async function waitForPort(port: number): Promise<boolean> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const connected = await new Promise<boolean>((resolve) => {
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.end();
        resolve(true);
      });
      socket.on('error', () => resolve(false));
    });

    if (connected) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return false;
}

// Sobe um svnserve local. Entre escolher a porta e o svnserve ocupá-la, outro
// teste em paralelo pode pegar a mesma porta; por isso confere que o processo
// está vivo e que o repositório esperado responde nesse servidor.
export async function startSvnserve(reposRoot: string, probeRepository: string, configDir: string): Promise<RunningSvnserve> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const port = await freePort();
    const child = spawn('svnserve', ['-d', '--foreground', '--listen-host', '127.0.0.1', '--listen-port', String(port), '-r', reposRoot], { stdio: 'ignore' });
    let exited = false;
    child.on('exit', () => {
      exited = true;
    });

    if (await waitForPort(port) && !exited) {
      const probe = await runSvn(['info', `svn://127.0.0.1:${port}/${probeRepository}`], { configDir });

      // Repositório com autenticação responde AUTH_REQUIRED: o servidor é o nosso.
      if (!exited && (probe.ok || probe.errorCode === 'AUTH_REQUIRED')) {
        return { port, process: child, stop: () => child.kill() };
      }
    }

    child.kill();
  }

  throw new Error('Não foi possível iniciar o svnserve de teste.');
}
