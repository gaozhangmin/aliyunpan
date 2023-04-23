export default function getFileIcon(category: string | undefined, ext: string | undefined, mimext: string | undefined, mime: string | undefined, size: number): string[] {
  if (!ext) ext = ''
  if (!mime) mime = ''
  if (!mimext) mimext = ''
  if (!category) category = 'others'

  /**
   * 1、图片支持以下格式：JPEG、BMP、PNG、JPG
   * 2、视频文件支持以下格式：MP4、3GP、AVI、FLV、Webm、MOV、AMR、ASF、VCD（MPEG-1 video）、DVD（MPEG-2）、M4V、3G2、MJPEG、DATA、AVI（H261，H263，H264）、DV、GXF、CAVS video、DNxHD、FFM
   * 3、音频文件支持以下格式：MP3、FLAC、AC3、Ogg、ADX、WAV、AIFF、ALAW、AU、DTS、MP2、Dirac、HLS
   * 4、文档/文本文件支持以下格式：PDF、WORD、TXT、PPT、EXCEL
   */

  ext = '.' + ext.toLowerCase().replace('.', '').trim() + '.'
  mimext = '.' + mimext.toLowerCase().replace('.', '').trim() + '.'

  switch (ext) {
    case '.txt.':
      return ['doc', 'fa-file-text']
    case '.rar.':
      return ['zip', 'fa-file-archive']
    case '.rtf.':
      return ['doc', 'fa-file-word']
    case '.psd.':
      return ['others', 'fa-file-image']
    case '.torrent.':
      return ['others', 'fa-file']
    case '.iso.':
      return ['others', 'fa-file']
    case '.exe.':
      return ['others', 'fa-file']
    case '.apk.':
      return ['others', 'fa-file']
    case '.tar.':
      return ['others', 'fa-file-archive']
    case '.7z.':
      return ['others', 'fa-file-archive']
    case '.svg.':
      return ['image3', 'fa-file-image']
    case '.azw.':
      return ['doc', 'fa-file']
    case '.azw3.':
      return ['doc', 'fa-file']
    case '.epub.':
      return ['doc', 'fa-file']
  }

  if (category == 'zip' || mimext == '.zip.') {
    
    return ['zip', 'fa-file-archive']
  }

  
  if (';.png.vif.ico.webp.gif.'.indexOf(ext) > 0) {
    return ['image2', 'fa-file-image']
  }

  if (category == 'image') {
    return ['image', 'fa-file-image']
  }

  if (mime.startsWith('image/')) return ['image3', 'fa-file-image']
  if (ext == '.pdf.' || mimext == '.pdf.') return ['doc', 'fa-file-pdf']
  
  if (';.doc.docm.docx.dot.dotm.dotx.wps.wpt.'.indexOf(ext) > 0) return ['doc', 'fa-file-word']
  if (';.pot.ett.'.indexOf(ext) > 0) return ['doc2', 'fa-file-text']
  if ((mimext.startsWith('.txt') || mimext.startsWith('.doc') || mimext.startsWith('.ppt')) && ';.dps.dpt.potm.potx.pps.ppsm.ppsx.ppt.pptm.pptx.'.indexOf(ext) > 0) return ['doc', 'fa-file-powerpoint']
  if ((mimext.startsWith('.txt') || mimext.startsWith('.xls')) && ';.xls.xlsx.et.xlsm.xlt.xltm.xltx.'.indexOf(ext) > 0) return ['doc', 'fa-file-excel']

  if (mime.startsWith('text/')) return ['others', 'fa-file-text']
  if (ext == '.json.') return ['others', 'fa-file-text']

  if (category == 'video') {
    
    return ['video', 'fa-file-video']
  }
  if (mime.startsWith('video/')) return ['video2', 'fa-file-video']
  if (ext == '.ts.' && size > 5 * 1024 * 1024) return ['video2', 'fa-file-video']
  if (';.3iv.cpk.divx.hdv.fli.f4v.f4p.m2t.m2ts.mts.trp.mkv.mp4.mpg4.nsv.nut.nuv.rm.rmvb.vob.wmv.mk3d.hevc.yuv.y4m.mov.avi.flv.mpg.3gp.m4v.mpeg.asf.wmz.webm.pmp.mpga'.indexOf(ext) > 0) {
    return ['video2', 'fa-file-video']
  }
  if (ext == '.mp3.' && category == 'audio') return ['audio', 'fa-file-audio']
  if (category == 'audio' && mimext != '.unknown.') {
    
    return ['audio', 'fa-file-audio']
  }
  if (mime.startsWith('audio/')) return ['audio', 'fa-file-audio']
  if (';.ape.aac.cda.dsf.dtshd.eac3.m1a.m2a.m4a.mka.mpa.mpc.opus.ra.tak.tta.wma.wv.'.indexOf(ext) > 0) {
    return ['audio2', 'fa-file-audio']
  }

  return ['others', 'fa-file']
}
