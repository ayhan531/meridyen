import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

/** Kullanıcının portföyü, emirleri, hesap hareketleri ve tercihleri (uygulamanın durum nesnesi). */
@Entity({ name: 'app_states' })
export class AppState {
  @PrimaryColumn({ name: 'user_no', type: 'varchar', length: 12 })
  userNo: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_no' })
  user: User;

  @Column({ type: 'jsonb' })
  data: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  rev: number;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
