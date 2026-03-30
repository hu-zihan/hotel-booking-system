import React from 'react';
import { Tag, Button } from 'antd-mobile';
import { Image } from 'antd';
import './RoomCard.css';

export interface RoomCardProps {
  id: string;
  name: string;
  price: number;
  breakfast?: boolean;
  capacity?: number;
  size?: number;
  imageUrl?: string;
  status?: number;
  onBook?: (room: RoomCardProps) => void;
}

export default function RoomCard({
  id,
  name,
  price,
  breakfast,
  capacity,
  size,
  imageUrl,
  status,
  onBook,
}: RoomCardProps) {
  return (
    <div className="room-card">
      {imageUrl ? (
        <div className="room-card-img-wrap">
          <Image
            src={imageUrl}
            alt={name}
            width="100%"
            height="120px"
            style={{ objectFit: 'cover' }}
            preview={false}
          />
          {breakfast && <span className="room-card-breakfast-tag">含早</span>}
        </div>
      ) : (
        <div className="room-card-img-placeholder">
          <span>暂无图片</span>
        </div>
      )}

      <div className="room-card-body">
        <div className="room-card-name">{name}</div>
        <div className="room-card-facility">
          {size && <span>面积: {size}m²</span>}
          {capacity && <span>可住: {capacity}人</span>}
        </div>
        <div className="room-card-footer">
          <div className="room-card-price">
            <span className="price-symbol">¥</span>
            <span className="price-num">{price}</span>
            <span className="price-unit">/晚</span>
          </div>
          <Button
            size="small"
            color="primary"
            onClick={() => onBook?.({ id, name, price, breakfast, capacity, size, imageUrl })}
          >
            预订
          </Button>
        </div>
      </div>
    </div>
  );
}
