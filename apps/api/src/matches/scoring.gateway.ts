import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' } })
export class ScoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_match')
  handleJoinMatch(
    @MessageBody() data: { matchId: number | string },
    @ConnectedSocket() client: Socket,
  ) {
    const room = `match_${data.matchId}`;
    client.join(room);
    console.log(`Client ${client.id} joined room ${room}`);
  }

  // Method called by MatchesService to broadcast the event
  broadcastMatchEvent(matchId: number | string, eventPayload: any) {
    const room = `match_${matchId}`;
    this.server.to(room).emit('MATCH_EVENT', eventPayload);
  }
}
