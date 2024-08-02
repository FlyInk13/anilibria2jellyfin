import type { AnilibriaPlayerItem, AnilibriaPlayerQuality, AnilibriaTitle } from "./Anilibria";
import { ContentID } from "./ContentID";

export class JellyFinAdapter {
    public userName = 'demo';
    public userId = 'a076a5bfc9034f379f5889bc6dafc77b';
    public serverId = '713dc3fe952b438fa70ed35e4ef0525a';
    public accessToken = 'eacd06e811c14d789bc051b8a21fc046'

    getAuthenticationResult() {
        return {
            "User": this.getUserDto(),
            "SessionInfo": this.getSessionInfo(),
            "AccessToken": this.accessToken,
            "ServerId": this.serverId,
        };
    }

    getUserDto() {
        return {
            "Name": this.userName,
            "ServerId": this.serverId,
            "Id": this.serverId,
            "HasPassword": false,
            "HasConfiguredPassword": false,
            "HasConfiguredEasyPassword": true,
            "EnableAutoLogin": false,
            "LastLoginDate": "2024-02-11T00:13:54.1200198Z",
            "LastActivityDate": "2024-02-11T00:13:54.1200198Z",
            "Configuration": {
              "AudioLanguagePreference": "",
              "PlayDefaultAudioTrack": true,
              "SubtitleLanguagePreference": "dut",
              "DisplayMissingEpisodes": true,
              "GroupedFolders": [],
              "SubtitleMode": "Always",
              "DisplayCollectionsView": false,
              "EnableLocalPassword": true,
              "OrderedViews": [],
              "LatestItemsExcludes": [],
              "MyMediaExcludes": [],
              "HidePlayedInLatest": false,
              "RememberAudioSelections": true,
              "RememberSubtitleSelections": true,
              "EnableNextEpisodeAutoPlay": true
            },
            "Policy": {
              "IsAdministrator": false,
              "IsHidden": true,
              "IsDisabled": false,
              "BlockedTags": [],
              "EnableUserPreferenceAccess": true,
              "AccessSchedules": [],
              "BlockUnratedItems": [],
              "EnableRemoteControlOfOtherUsers": false,
              "EnableSharedDeviceControl": false,
              "EnableRemoteAccess": true,
              "EnableLiveTvManagement": false,
              "EnableLiveTvAccess": true,
              "EnableMediaPlayback": true,
              "EnableAudioPlaybackTranscoding": true,
              "EnableVideoPlaybackTranscoding": true,
              "EnablePlaybackRemuxing": true,
              "ForceRemoteSourceTranscoding": false,
              "EnableContentDeletion": false,
              "EnableContentDeletionFromFolders": [],
              "EnableContentDownloading": true,
              "EnableSyncTranscoding": true,
              "EnableMediaConversion": true,
              "EnabledDevices": [],
              "EnableAllDevices": true,
              "EnabledChannels": [],
              "EnableAllChannels": true,
              "EnabledFolders": [],
              "EnableAllFolders": true,
              "InvalidLoginAttemptCount": 0,
              "LoginAttemptsBeforeLockout": -1,
              "MaxActiveSessions": 0,
              "EnablePublicSharing": false,
              "BlockedMediaFolders": [],
              "BlockedChannels": [],
              "RemoteClientBitrateLimit": 0,
              "AuthenticationProviderId": "Jellyfin.Server.Implementations.Users.DefaultAuthenticationProvider",
              "PasswordResetProviderId": "Jellyfin.Server.Implementations.Users.DefaultPasswordResetProvider",
              "SyncPlayAccess": "CreateAndJoinGroups"
            }
        };
    }

    getSessionInfo() {
        return {
            "PlayState": {
              "CanSeek": false,
              "IsPaused": false,
              "IsMuted": false,
              "RepeatMode": "RepeatNone"
            },
            "AdditionalUsers": [],
            "Capabilities": {
              "PlayableMediaTypes": [],
              "SupportedCommands": [],
              "SupportsMediaControl": false,
              "SupportsContentUploading": false,
              "SupportsPersistentIdentifier": true,
              "SupportsSync": false
            },
            "RemoteEndPoint": "127.0.0.1",
            "PlayableMediaTypes": [],
            "Id": "90d5d409c9176500e10816167c9867a6",
            "UserId": this.userId,
            "UserName": this.userName,
            "Client": "Infuse",
            "LastActivityDate": "2024-02-11T00:13:54.1381659Z",
            "LastPlaybackCheckIn": "0001-01-01T00:00:00.0000000Z",
            "DeviceName": "Mac",
            "DeviceId": "BC0A65DF-C610-5E4E-A250-1C9D2D488FEF",
            "ApplicationVersion": "7.6.7",
            "IsActive": true,
            "SupportsMediaControl": false,
            "SupportsRemoteControl": false,
            "NowPlayingQueue": [],
            "NowPlayingQueueFullItems": [],
            "HasCustomDeviceName": false,
            "ServerId": this.serverId,
            "SupportedCommands": []
        };
    }

    getEmptyArray() {
        return [];
    }

    getEmptyList() {
        return {
            "Items": [],
            "TotalRecordCount": 0,
            "StartIndex": 0
        };
    }

    getSeason(mockID: ContentID, name: string) {
        return {
            "Name": name,
            "ServerId": this.serverId,
            "Id": mockID.toString(),
            "CanDelete": false,
            "PremiereDate": "2010-06-16T00:00:00.0000000Z",
            "ChannelId": null,
            "ProductionYear": 2010,
            "IndexNumber": 1,
            "IsFolder": true,
            "Type": "Season",
            "ParentBackdropItemId": "ParentBackdropItemId",
            "ParentBackdropImageTags": [
              "ParentBackdropImageTags"
            ],
            "UserData": {
              "UnplayedItemCount": 1,
              "PlaybackPositionTicks": 0,
              "PlayCount": 0,
              "IsFavorite": false,
              "Played": false,
              "Key": "170551001"
            },
            "ChildCount": 2,
            "SeriesName": name,
            "SeriesId": mockID.toString(),
            "PrimaryImageAspectRatio": 1,
            "SeriesPrimaryImageTag": mockID.toString(),
            "ImageTags": {
              "Primary": mockID.toString(),
            },
            "BackdropImageTags": [],
            "LocationType": "FileSystem",
            "MediaType": "Unknown"
          }
    }

    getMediaSource(mockID: ContentID, episode: AnilibriaPlayerItem, qualityKey: AnilibriaPlayerQuality) {
      return  {
        "Protocol": "File",
        "Id": qualityKey,
        "Path": "/media/" + mockID.toString() + '_' + qualityKey + ".m3u8",
        "Type": "Default",
        "Container": "m3u8",
        "Size": 47552616,
        "Name": episode.name + ' ' + qualityKey,
        "IsRemote": false,
        "ETag": "f2c9f12aa39e9312fe369824d371a64f",
        "RunTimeTicks": 3240349952,
        "ReadAtNativeFramerate": false,
        "IgnoreDts": false,
        "IgnoreIndex": false,
        "GenPtsInput": false,
        "SupportsTranscoding": true,
        "SupportsDirectStream": true,
        "SupportsDirectPlay": true,
        "IsInfiniteStream": false,
        "RequiresOpening": false,
        "RequiresClosing": false,
        "RequiresLooping": false,
        "SupportsProbing": true,
        "VideoType": "VideoFile",
        "MediaStreams": this.getMediaStreams(mockID, episode),
        "MediaAttachments": [],
        "Formats": [],
        "Bitrate": 1174011,
        "RequiredHttpHeaders": {},
        "TranscodingSubProtocol": "http",
        "DefaultAudioStreamIndex": 1,
        "DefaultSubtitleStreamIndex": 3
      }
    }

    getMediaStreams(mockID: ContentID, episode: AnilibriaPlayerItem) {
        return {
          "Codec": "h264",
          "CodecTag": "avc1",
          "Language": "und",
          "TimeBase": "1/45000",
          "CodecTimeBase": "1877/90000",
          "VideoRange": "SDR",
          "VideoRangeType": "SDR",
          "AudioSpatialFormat": "None",
          "DisplayTitle": "720p H264 SDR",
          "NalLengthSize": "4",
          "IsInterlaced": false,
          "IsAVC": true,
          "BitRate": 1042260,
          "BitDepth": 8,
          "RefFrames": 1,
          "IsDefault": true,
          "IsForced": false,
          "IsHearingImpaired": false,
          "Height": 720,
          "Width": 1280,
          "AverageFrameRate": 23.974428,
          "RealFrameRate": 23.974428,
          "Profile": "High",
          "Type": "Video",
          "AspectRatio": "16:9",
          "Index": 0,
          "IsExternal": false,
          "IsTextSubtitleStream": false,
          "SupportsExternalStream": false,
          "PixelFormat": "yuv420p",
          "Level": 31
        };
    }

    getEpisode(contentID: ContentID, title: AnilibriaTitle, episode: AnilibriaPlayerItem) {
        return {
            "Name": episode.name ?? episode.episode ?? '?',
            "ServerId": "713dc3fe952b438fa70ed35e4ef0525a",
            "Id": contentID.toString(),
            "DateCreated": new Date(episode.created_timestamp).toISOString(),
            "CanDelete": false,
            "HasSubtitles": true,
            "Container": "mov,mp4,m4a,3gp,3g2,mj2",
            "PremiereDate": new Date(episode.created_timestamp).toISOString(),
            "MediaSources": Object.keys(episode.hls).map((qualityKey: string) => {
              return this.getMediaSource(contentID, episode, qualityKey as AnilibriaPlayerQuality);
            }),
            "Path": "/media/TV Shows/Pioneer One (2010)/Season 01/Pioneer One (2010) - S01E01 - Earthfall/Pioneer One (2010) - S01E01 - Earthfall.mp4",
            "ChannelId": null,
            // "Overview": "An object from space spreads radiation over North America. Fearing terrorism, U.S. Homeland Security agents are dispatched to investigate and contain the damage. What they discover is a forgotten relic of the old Soviet space program, whose return to Earth will have implications for the entire world.",
            // "Genres": [
            //   "Drama",
            //   "Sci-Fi"
            // ],
            "CommunityRating": 7,
            //"RunTimeTicks": 3240349952,
            //"ProductionYear": 2010,
            "IndexNumber": 1,
            "ParentIndexNumber": 1,
            "IsFolder": false,
            "ParentId": contentID.toString(2),
            "Type": "Episode",
            "People": [],
            "GenreItems": [],
            "ParentBackdropItemId": contentID.toString(),
            "ParentBackdropImageTags": [
              contentID.toString()
            ],
            // "UserData": {
            //   "PlayedPercentage": 36.63199832065546,
            //   "PlaybackPositionTicks": 1187004940,
            //   "PlayCount": 18,
            //   "IsFavorite": true,
            //   "LastPlayedDate": "2024-04-20T18:15:27.1362519Z",
            //   "Played": false,
            //   "Key": "170551001001"
            // },
            "SeriesName": title.names.ru,
            "SeriesId": contentID.toString(1),
            "SeasonId": contentID.toString(2),
            "PrimaryImageAspectRatio": 1.7777777777777777,
            "SeriesPrimaryImageTag": contentID.toString(),
            "SeasonName": "Season 1",
            "MediaStreams": this.getMediaStreams(contentID, episode),
            "VideoType": "VideoFile",
            "ImageTags": {
              "Primary": contentID.toString()
            },
            "BackdropImageTags": [],
            "LocationType": "FileSystem",
            "MediaType": "Video"
        };
    }

    getSerial(mockID: ContentID, name: string) {
        return {
            "Name": name,
            "ServerId": this.serverId,
            "Id": mockID.toString(),
            "CanDelete": false,
            "PremiereDate": "2010-06-16T00:00:00.0000000Z",
            "OfficialRating": "NR",
            "ChannelId": null,
            "CommunityRating": 6.9,
            "RunTimeTicks": 17999998976,
            "ProductionYear": 2010,
            "IsFolder": true,
            "Type": "Series",
            "UserData": {
              "UnplayedItemCount": 1,
              "PlaybackPositionTicks": 0,
              "PlayCount": 0,
              "IsFavorite": false,
              "Played": false,
              "Key": "170551"
            },
            "Status": "Ended",
            "AirDays": [],
            "PrimaryImageAspectRatio": 0.68,
            "ImageTags": {
              "Primary": mockID.toString(),
            },
            "LocationType": "FileSystem",
            "MediaType": "Unknown",
            "EndDate": "2011-12-13T00:00:00.0000000Z"
        };      
    }

    getList<I, R>(list: I[], itemBuilder: (item: I) => R) {
      return {
        "Items": list.map(itemBuilder),
        "TotalRecordCount": list.length,
        "StartIndex": 0
      }
    }

    getCollectionFolder(folderId: ContentID, name: string) {
        return {
            "Name": name,
            "ServerId": "713dc3fe952b438fa70ed35e4ef0525a",
            "Id": folderId.toString(),
            "Etag": "getTVShows-etag",
            "DateCreated": "2020-01-01T19:03:06.8840063Z",
            "CanDelete": false,
            "CanDownload": false,
            "SortName": name,
            "ExternalUrls": [],
            "Path": "/config/root/default/" + name,
            "EnableMediaSourceDisplay": true,
            "ChannelId": null,
            "Taglines": [],
            "Genres": [],
            "PlayAccess": "Full",
            "RemoteTrailers": [],
            "ProviderIds": {},
            "IsFolder": true,
            "ParentId": "getTVShows-ParentId",
            "Type": "CollectionFolder",
            "People": [],
            "Studios": [],
            "GenreItems": [],
            "LocalTrailerCount": 0,
            "UserData": {
              "PlaybackPositionTicks": 0,
              "PlayCount": 0,
              "IsFavorite": false,
              "Played": false,
              "Key": "767bffe4-f11c-93ef-34b8-05451a696a4e"
            },
            "ChildCount": 3,
            "SpecialFeatureCount": 0,
            "DisplayPreferencesId": "767bffe4f11c93ef34b805451a696a4e",
            "Tags": [],
            "PrimaryImageAspectRatio": 1.7777777777777777,
            "CollectionType": "tvshows",
            "ImageTags": {
              "Primary": "getTVShows-ImageTags-Primary"
            },
            "BackdropImageTags": [],
            "LocationType": "FileSystem",
            "MediaType": "Unknown",
            "LockedFields": [],
            "LockData": false
        };
    }

    getRoot() {
        return {
            "Items": [
                this.getCollectionFolder(ContentID.root(), 'Обновления')
            ],
            "TotalRecordCount": 1,
            "StartIndex": 0
        };
    }

    getPublicSystemInfo() {
        return {
            "LocalAddress": "http://172.17.0.2:8096/stable",
            "ServerName": "Stable Demo",
            "Version": "10.8.13",
            "ProductName": "Jellyfin Server",
            "OperatingSystem": "Linux",
            "Id": "713dc3fe952b438fa70ed35e4ef0525a",
            "StartupWizardCompleted": true
        };
    }

    getDisplayPreferencesDto() {
        return {
            "Id": "3ce5b65d-e116-d731-65d1-efc4a30ec35c",
            "SortBy": "SortName",
            "RememberIndexing": false,
            "PrimaryImageHeight": 250,
            "PrimaryImageWidth": 250,
            "ScrollDirection": "Horizontal",
            "ShowBackdrop": true,
            "RememberSorting": false,
            "SortOrder": "Ascending",
            "ShowSidebar": false,
            "Client": "emby"
        };
    }
}